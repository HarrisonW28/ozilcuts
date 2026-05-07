<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Mail\AppointmentCancelledMail;
use App\Models\Appointment;
use App\Services\Booking\BookingService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

final class AppointmentCancelController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        BookingService $booking,
        PaymentService $payments,
    ): JsonResponse {
        $this->authorize('cancel', $appointment);

        $cancelled = $booking->cancel($appointment);
        $payments->refundForCancellation($cancelled);
        $cancelled->refresh();
        $cancelled->load(['service', 'barber', 'customer']);

        $this->dispatchCancellation($cancelled);

        return response()->json(
            (new AppointmentResource($cancelled))->toArray($request),
        );
    }

    private function dispatchCancellation(Appointment $appointment): void
    {
        $customer = $appointment->customer;
        if ($customer === null) {
            return;
        }

        $mail = Mail::to($customer->email);
        $barberEmail = $appointment->barber?->email;
        if ($barberEmail !== null && $barberEmail !== $customer->email) {
            $mail->cc($barberEmail);
        }
        $mail->queue(new AppointmentCancelledMail($appointment));
    }
}
