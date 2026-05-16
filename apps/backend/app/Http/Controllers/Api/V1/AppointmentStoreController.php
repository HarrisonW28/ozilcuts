<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\AbuseBlockedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Mail\AppointmentConfirmedMail;
use App\Models\Appointment;
use App\Notifications\NotificationEvents;
use App\Services\Audit\AuditLogService;
use App\Services\Booking\BookingService;
use App\Support\AuditAction;
use App\Services\Notifications\AppointmentNotificationPayload;
use App\Services\Notifications\AppointmentStaffAlertService;
use App\Services\Notifications\NotificationService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class AppointmentStoreController extends Controller
{
    public function __invoke(
        StoreAppointmentRequest $request,
        BookingService $booking,
        PaymentService $payments,
        NotificationService $notifications,
        AppointmentStaffAlertService $staffAlerts,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        try {
            $payload = [
                'service_id' => (int) $request->validated('service_id'),
                'barber_user_id' => (int) $request->validated('barber_user_id'),
                'starts_at' => (string) $request->validated('starts_at'),
                'notes' => $request->validated('notes'),
            ];
            $customerUserId = $request->validated('customer_user_id');
            if ($customerUserId !== null) {
                $payload['customer_user_id'] = (int) $customerUserId;
            }

            $appointment = $booking->book($user, $payload);

            if ($customerUserId !== null) {
                $audit->record(
                    action: AuditAction::APPOINTMENT_BOOKED_BY_STAFF,
                    actor: $user,
                    request: $request,
                    subjectType: 'appointment',
                    subjectId: $appointment->id,
                    targetUserId: (int) $customerUserId,
                    metadata: [
                        'barber_user_id' => $appointment->barber_user_id,
                        'starts_at' => (string) $appointment->starts_at,
                    ],
                );
            }
        } catch (AbuseBlockedException $e) {
            throw $e;
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $clientSecret = $payments->ensureDepositIntent($appointment);
        $appointment->load(['service', 'barber', 'customer']);

        $this->dispatchConfirmation($appointment, $notifications);
        $staffAlerts->bookingCreated($appointment, $user);

        $body = (new AppointmentResource($appointment))->toArray($request);
        $body['payment'] = [
            'enabled' => $payments->isEnabled(),
            'currency' => $payments->currency(),
            'publishable_key' => (string) config('services.stripe.publishable', '') ?: null,
            'client_secret' => $clientSecret,
        ];

        return response()->json($body, 201);
    }

    private function dispatchConfirmation(
        Appointment $appointment,
        NotificationService $notifications,
    ): void {
        $customer = $appointment->customer;
        if ($customer === null) {
            return;
        }
        $payload = AppointmentNotificationPayload::build($appointment);

        $notifications->send(
            $customer,
            NotificationEvents::APPOINTMENT_CONFIRMED,
            $payload,
            mail: new AppointmentConfirmedMail($appointment),
        );
    }
}
