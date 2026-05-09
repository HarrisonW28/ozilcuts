<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Mail\AppointmentCancelledMail;
use App\Models\Appointment;
use App\Notifications\NotificationEvents;
use App\Services\Booking\BookingService;
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
    ): JsonResponse {
        $this->authorize('cancel', $appointment);

        $cancelled = $booking->cancel($appointment);
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
