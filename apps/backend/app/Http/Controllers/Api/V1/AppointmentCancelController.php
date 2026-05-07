<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Services\Booking\BookingService;
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
    ): JsonResponse {
        $this->authorize('cancel', $appointment);

        $cancelled = $booking->cancel($appointment);
        $payments->refundForCancellation($cancelled);
        $cancelled->refresh();
        $cancelled->load(['service', 'barber', 'customer']);

        return response()->json(
            (new AppointmentResource($cancelled))->toArray($request),
        );
    }
}
