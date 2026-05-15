<?php

namespace App\Services\Appointments;

use App\Mail\AppointmentRescheduledMail;
use App\Models\Appointment;
use App\Models\AppointmentAdjustmentRequest;
use App\Models\User;
use App\Notifications\NotificationEvents;
use App\Services\Booking\BookingService;
use App\Services\Notifications\AppointmentNotificationPayload;
use App\Services\Notifications\AppointmentStaffAlertService;
use App\Services\Notifications\NotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Lightweight move requests: propose a nearby slot, other party approves or rejects.
 * Applies the real reschedule only on approval — no full reschedule wizard.
 */
final class AppointmentAdjustmentService
{
    private const SUGGESTION_LIMIT = 8;

    private const NEARBY_DAY_SPAN = 1;

    public function __construct(
        private readonly BookingService $booking,
        private readonly NotificationService $notifications,
        private readonly AppointmentStaffAlertService $staffAlerts,
    ) {}

    /**
     * @return array{
     *     current_starts_at: string|null,
     *     suggestions: list<array{starts_at: string, label: string, offset_minutes: int}>,
     * }
     */
    public function nearbySuggestions(Appointment $appointment): array
    {
        $appointment->loadMissing(['service', 'barber']);
        $current = $appointment->starts_at !== null
            ? CarbonImmutable::parse((string) $appointment->starts_at)
            : null;

        if ($current === null || $appointment->service === null || $appointment->barber === null) {
            return [
                'current_starts_at' => $appointment->starts_at?->toIso8601String(),
                'suggestions' => [],
            ];
        }

        $service = $appointment->service;
        $barber = $appointment->barber;
        $excludeId = (int) $appointment->id;
        $candidates = [];

        for ($dayOffset = -self::NEARBY_DAY_SPAN; $dayOffset <= self::NEARBY_DAY_SPAN; $dayOffset++) {
            $date = $current->addDays($dayOffset)->startOfDay();
            if ($date->lessThan(CarbonImmutable::now()->startOfDay())) {
                continue;
            }
            $slots = $this->booking->availableSlots($barber, $service, $date, $excludeId);
            foreach ($slots as $slotIso) {
                $slotStart = CarbonImmutable::parse($slotIso);
                if ($slotStart->equalTo($current)) {
                    continue;
                }
                $offsetMinutes = (int) round($current->diffInMinutes($slotStart, false));
                $candidates[] = [
                    'starts_at' => $slotStart->format('Y-m-d\TH:i:s'),
                    'label' => $this->offsetLabel($offsetMinutes),
                    'offset_minutes' => $offsetMinutes,
                ];
            }
        }

        usort(
            $candidates,
            fn (array $a, array $b) => abs($a['offset_minutes']) <=> abs($b['offset_minutes']),
        );

        $seen = [];
        $out = [];
        foreach ($candidates as $row) {
            if (isset($seen[$row['starts_at']])) {
                continue;
            }
            $seen[$row['starts_at']] = true;
            $out[] = $row;
            if (count($out) >= self::SUGGESTION_LIMIT) {
                break;
            }
        }

        return [
            'current_starts_at' => $current->toIso8601String(),
            'suggestions' => $out,
        ];
    }

    /**
     * @return array{request: array<string, mixed>|null}
     */
    public function pendingPayload(Appointment $appointment, User $viewer): array
    {
        $pending = $this->findPending($appointment);
        if ($pending === null) {
            return ['request' => null];
        }

        return ['request' => $this->serializeRequest($pending, $viewer)];
    }

    public function createRequest(
        Appointment $appointment,
        User $requester,
        CarbonImmutable $requestedStart,
    ): AppointmentAdjustmentRequest {
        if ($appointment->status !== Appointment::STATUS_CONFIRMED) {
            throw new RuntimeException('Only confirmed appointments can be adjusted.');
        }

        $current = $appointment->starts_at !== null
            ? CarbonImmutable::parse((string) $appointment->starts_at)
            : null;
        if ($current === null || ! $current->greaterThan(CarbonImmutable::now())) {
            throw new RuntimeException('This visit has already started or passed.');
        }

        if ($requestedStart->equalTo($current)) {
            throw new RuntimeException('Pick a different time than the current booking.');
        }

        $this->assertSlotBookable($appointment, $requestedStart);

        return DB::transaction(function () use ($appointment, $requester, $requestedStart): AppointmentAdjustmentRequest {
            $existing = $this->findPending($appointment);
            if ($existing !== null) {
                if ((int) $existing->requested_by_user_id === (int) $requester->id) {
                    $existing->update(['status' => AppointmentAdjustmentRequest::STATUS_WITHDRAWN]);
                } else {
                    throw new RuntimeException('A move request is already waiting for a response.');
                }
            }

            return AppointmentAdjustmentRequest::query()->create([
                'appointment_id' => $appointment->id,
                'requested_by_user_id' => $requester->id,
                'requested_starts_at' => $requestedStart->toDateTimeString(),
                'status' => AppointmentAdjustmentRequest::STATUS_PENDING,
            ]);
        });
    }

    public function approve(AppointmentAdjustmentRequest $request, User $responder): Appointment
    {
        if ($request->status !== AppointmentAdjustmentRequest::STATUS_PENDING) {
            throw new RuntimeException('This move request is no longer pending.');
        }

        $appointment = $request->appointment;
        if ($appointment === null) {
            throw new RuntimeException('Appointment not found.');
        }

        if (! $this->canRespond($request, $responder)) {
            throw new RuntimeException('You cannot approve this move request.');
        }

        $appointment->load(['service', 'barber', 'customer']);
        $previousStart = $appointment->starts_at !== null
            ? CarbonImmutable::parse((string) $appointment->starts_at)->format('l, M j, Y \a\t g:i A T')
            : 'unknown';
        $previousStartIso = $appointment->starts_at?->toIso8601String();

        $newStart = CarbonImmutable::parse((string) $request->requested_starts_at);

        return DB::transaction(function () use (
            $request,
            $responder,
            $appointment,
            $newStart,
            $previousStart,
            $previousStartIso,
        ): Appointment {
            $rescheduled = $this->booking->reschedule($appointment, $newStart);

            $request->update([
                'status' => AppointmentAdjustmentRequest::STATUS_APPROVED,
                'responded_by_user_id' => $responder->id,
                'responded_at' => now(),
            ]);

            $this->dispatchRescheduleNotifications(
                $rescheduled,
                $previousStart,
                $previousStartIso,
                $responder,
            );

            return $rescheduled->fresh(['service', 'barber', 'customer']) ?? $rescheduled;
        });
    }

    public function reject(AppointmentAdjustmentRequest $request, User $responder): AppointmentAdjustmentRequest
    {
        if ($request->status !== AppointmentAdjustmentRequest::STATUS_PENDING) {
            throw new RuntimeException('This move request is no longer pending.');
        }

        if (! $this->canRespond($request, $responder)) {
            throw new RuntimeException('You cannot reject this move request.');
        }

        $request->update([
            'status' => AppointmentAdjustmentRequest::STATUS_REJECTED,
            'responded_by_user_id' => $responder->id,
            'responded_at' => now(),
        ]);

        return $request->fresh() ?? $request;
    }

    public function withdraw(AppointmentAdjustmentRequest $request, User $requester): AppointmentAdjustmentRequest
    {
        if ($request->status !== AppointmentAdjustmentRequest::STATUS_PENDING) {
            throw new RuntimeException('This move request is no longer pending.');
        }
        if ((int) $request->requested_by_user_id !== (int) $requester->id && ! $requester->isAdmin()) {
            throw new RuntimeException('Only the requester can withdraw this move.');
        }

        $request->update([
            'status' => AppointmentAdjustmentRequest::STATUS_WITHDRAWN,
            'responded_by_user_id' => $requester->id,
            'responded_at' => now(),
        ]);

        return $request->fresh() ?? $request;
    }

    public function canRespond(AppointmentAdjustmentRequest $request, User $user): bool
    {
        if ($request->status !== AppointmentAdjustmentRequest::STATUS_PENDING) {
            return false;
        }
        if ((int) $request->requested_by_user_id === (int) $user->id) {
            return false;
        }

        $appointment = $request->appointment;
        if ($appointment === null) {
            return false;
        }

        $requesterId = (int) $request->requested_by_user_id;
        $customerId = (int) ($appointment->customer_user_id ?? 0);
        $barberId = (int) $appointment->barber_user_id;

        if ($requesterId === $customerId) {
            return $user->isAdmin() || (int) $user->id === $barberId;
        }
        if ($requesterId === $barberId) {
            return $customerId > 0 && (int) $user->id === $customerId;
        }

        return $customerId > 0 && (int) $user->id === $customerId;
    }

    public function canWithdraw(AppointmentAdjustmentRequest $request, User $user): bool
    {
        if ($request->status !== AppointmentAdjustmentRequest::STATUS_PENDING) {
            return false;
        }

        return (int) $request->requested_by_user_id === (int) $user->id || $user->isAdmin();
    }

    public function findPending(Appointment $appointment): ?AppointmentAdjustmentRequest
    {
        return AppointmentAdjustmentRequest::query()
            ->where('appointment_id', $appointment->id)
            ->where('status', AppointmentAdjustmentRequest::STATUS_PENDING)
            ->with(['requestedBy.role'])
            ->latest('id')
            ->first();
    }

    private function assertSlotBookable(Appointment $appointment, CarbonImmutable $start): void
    {
        $appointment->loadMissing(['service', 'barber']);
        $barber = $appointment->barber;
        $service = $appointment->service;
        if ($barber === null || $service === null) {
            throw new RuntimeException('Appointment is incomplete.');
        }

        $slots = $this->booking->availableSlots(
            $barber,
            $service,
            $start->startOfDay(),
            (int) $appointment->id,
        );
        $needle = $start->format('Y-m-d\TH:i:s');
        if (! in_array($needle, $slots, true)) {
            throw new RuntimeException('Selected time is no longer available.');
        }
    }

    private function dispatchRescheduleNotifications(
        Appointment $appointment,
        string $previousStartDisplay,
        ?string $previousStartIso,
        User $actor,
    ): void {
        $customer = $appointment->customer;
        if ($customer !== null) {
            $payload = AppointmentNotificationPayload::build($appointment, $previousStartIso);
            $this->notifications->send(
                $customer,
                NotificationEvents::APPOINTMENT_RESCHEDULED,
                $payload,
                mail: new AppointmentRescheduledMail($appointment, $previousStartDisplay),
            );
        }

        $this->staffAlerts->bookingRescheduled(
            $appointment,
            previousStartDisplay: $previousStartDisplay,
            previousStartIso: $previousStartIso,
            actor: $actor,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeRequest(AppointmentAdjustmentRequest $request, User $viewer): array
    {
        $request->loadMissing(['appointment', 'requestedBy.role']);
        $appointment = $request->appointment;
        $requester = $request->requestedBy;

        return [
            'id' => $request->id,
            'appointment_id' => $request->appointment_id,
            'status' => $request->status,
            'requested_starts_at' => $request->requested_starts_at?->toIso8601String(),
            'current_starts_at' => $appointment?->starts_at?->toIso8601String(),
            'requested_by' => $requester !== null ? [
                'id' => $requester->id,
                'name' => $requester->name,
                'role' => $this->requesterRoleLabel($appointment, $requester),
            ] : null,
            'created_at' => $request->created_at?->toIso8601String(),
            'can_respond' => $this->canRespond($request, $viewer),
            'can_withdraw' => $this->canWithdraw($request, $viewer),
        ];
    }

    private function requesterRoleLabel(?Appointment $appointment, User $requester): string
    {
        if ($requester->isAdmin()) {
            return 'admin';
        }
        if ($appointment !== null && (int) $appointment->barber_user_id === (int) $requester->id) {
            return 'barber';
        }
        if ($appointment !== null && (int) $appointment->customer_user_id === (int) $requester->id) {
            return 'customer';
        }

        return 'staff';
    }

    private function offsetLabel(int $offsetMinutes): string
    {
        if ($offsetMinutes === 0) {
            return 'Same time';
        }
        $abs = abs($offsetMinutes);
        if ($abs < 60) {
            $unit = $abs === 1 ? 'min' : 'min';

            return $offsetMinutes < 0
                ? "{$abs} {$unit} earlier"
                : "{$abs} {$unit} later";
        }
        $hours = (int) round($abs / 60);
        $unit = $hours === 1 ? 'hr' : 'hrs';

        return $offsetMinutes < 0
            ? "{$hours} {$unit} earlier"
            : "{$hours} {$unit} later";
    }
}
