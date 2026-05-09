<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RescheduleAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Mail\AppointmentRescheduledMail;
use App\Models\Appointment;
use App\Notifications\NotificationEvents;
use App\Services\Booking\BookingService;
use App\Services\Notifications\AppointmentNotificationPayload;
use App\Services\Notifications\AppointmentStaffAlertService;
use App\Services\Notifications\NotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class AppointmentRescheduleController extends Controller
{
    public function __invoke(
        RescheduleAppointmentRequest $request,
        Appointment $appointment,
        BookingService $booking,
        NotificationService $notifications,
        AppointmentStaffAlertService $staffAlerts,
    ): JsonResponse {
        $this->authorize('reschedule', $appointment);

        $appointment->load(['service', 'barber', 'customer']);
        $previousStart = $appointment->starts_at !== null
            ? CarbonImmutable::parse((string) $appointment->starts_at)->format('l, M j, Y \a\t g:i A T')
            : 'unknown';
        $previousStartIso = $appointment->starts_at?->toIso8601String();

        try {
            $rescheduled = $booking->reschedule(
                $appointment,
                CarbonImmutable::parse((string) $request->validated('starts_at')),
            );
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $rescheduled->load(['service', 'barber', 'customer']);

        $this->dispatchReschedule($rescheduled, $previousStart, $previousStartIso, $notifications);
        $staffAlerts->bookingRescheduled(
            $rescheduled,
            previousStartDisplay: $previousStart,
            previousStartIso: $previousStartIso,
            actor: $request->user(),
        );

        return response()->json(
            (new AppointmentResource($rescheduled))->toArray($request),
        );
    }

    private function dispatchReschedule(
        Appointment $appointment,
        string $previousStartDisplay,
        ?string $previousStartIso,
        NotificationService $notifications,
    ): void {
        $customer = $appointment->customer;
        if ($customer === null) {
            return;
        }
        $payload = AppointmentNotificationPayload::build($appointment, $previousStartIso);

        $notifications->send(
            $customer,
            NotificationEvents::APPOINTMENT_RESCHEDULED,
            $payload,
            mail: new AppointmentRescheduledMail($appointment, $previousStartDisplay),
        );
    }
}
