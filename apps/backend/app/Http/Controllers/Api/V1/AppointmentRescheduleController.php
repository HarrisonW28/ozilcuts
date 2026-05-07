<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RescheduleAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Mail\AppointmentRescheduledMail;
use App\Models\Appointment;
use App\Services\Booking\BookingService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;
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
        $previousStart = $appointment->starts_at !== null
            ? CarbonImmutable::parse((string) $appointment->starts_at)->format('l, M j, Y \a\t g:i A T')
            : 'unknown';

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

        $this->dispatchReschedule($rescheduled, $previousStart);

        return response()->json(
            (new AppointmentResource($rescheduled))->toArray($request),
        );
    }

    private function dispatchReschedule(Appointment $appointment, string $previousStart): void
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
        $mail->queue(new AppointmentRescheduledMail($appointment, $previousStart));
    }
}
