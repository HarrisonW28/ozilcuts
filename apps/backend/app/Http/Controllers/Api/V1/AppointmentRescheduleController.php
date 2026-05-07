<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RescheduleAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Services\Booking\BookingService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class AppointmentRescheduleController extends Controller
{
    public function __invoke(
        RescheduleAppointmentRequest $request,
        Appointment $appointment,
        BookingService $booking,
    ): JsonResponse {
        $this->authorize('reschedule', $appointment);

        $appointment->load(['service', 'barber', 'customer']);

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

        return response()->json(
            (new AppointmentResource($rescheduled))->toArray($request),
        );
    }
}
