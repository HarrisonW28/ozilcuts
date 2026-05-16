<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Mail\AppointmentCancelledMail;
use App\Models\Appointment;
use App\Notifications\NotificationEvents;
use App\Services\Abuse\AbuseProtectionService;
use App\Services\Audit\AuditLogService;
use App\Services\Booking\BookingService;
use App\Support\AuditAction;
use App\Services\Notifications\AppointmentNotificationPayload;
use App\Services\Notifications\AppointmentStaffAlertService;
use App\Services\Notifications\NotificationService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentCancelController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        BookingService $booking,
        PaymentService $payments,
        NotificationService $notifications,
        AppointmentStaffAlertService $staffAlerts,
        AbuseProtectionService $abuse,
        AuditLogService $audit,
    ): JsonResponse {
        $this->authorize('cancel', $appointment);

        $actor = $request->user();
        $isCustomerSelfCancel =
            $actor !== null
            && (int) $appointment->customer_user_id === (int) $actor->id;

        if ($actor !== null) {
            $abuse->assertCustomerCanCancel($actor, $appointment);
        }

        $cancelled = $booking->cancel($appointment);

        if ($isCustomerSelfCancel) {
            $abuse->recordCustomerCancel($actor);
        } elseif ($actor !== null && ! $isCustomerSelfCancel) {
            $audit->record(
                action: AuditAction::APPOINTMENT_CANCELLED_BY_STAFF,
                actor: $actor,
                request: $request,
                subjectType: 'appointment',
                subjectId: $appointment->id,
                targetUserId: $appointment->customer_user_id,
                metadata: [
                    'barber_user_id' => $appointment->barber_user_id,
                    'starts_at' => (string) $appointment->starts_at,
                ],
            );
        }
        $payments->refundForCancellation($cancelled);
        $cancelled->refresh();
        $cancelled->load(['service', 'barber', 'customer']);

        $this->dispatchCancellation($cancelled, $notifications);
        $staffAlerts->bookingCancelled($cancelled, $request->user());

        return response()->json(
            (new AppointmentResource($cancelled))->toArray($request),
        );
    }

    private function dispatchCancellation(
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
            NotificationEvents::APPOINTMENT_CANCELLED,
            $payload,
            mail: new AppointmentCancelledMail($appointment),
        );
    }
}
