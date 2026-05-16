<?php

namespace App\Services\Barbers;

use App\Models\Appointment;
use App\Models\AppointmentReview;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

final class AppointmentReviewService
{
    /**
     * @param  array{rating: int, body: string}  $data
     */
    public function createForAppointment(
        Appointment $appointment,
        User $customer,
        array $data,
        CarbonImmutable $now,
    ): AppointmentReview {
        if ((int) $appointment->customer_user_id !== (int) $customer->id) {
            throw ValidationException::withMessages([
                'appointment' => ['You can only review your own visits.'],
            ]);
        }

        if ($appointment->status !== Appointment::STATUS_CONFIRMED) {
            throw ValidationException::withMessages([
                'appointment' => ['Only completed bookings can be reviewed.'],
            ]);
        }

        $startsAt = $appointment->starts_at !== null
            ? CarbonImmutable::parse((string) $appointment->starts_at)
            : null;

        if ($startsAt === null || ! $startsAt->lessThan($now)) {
            throw ValidationException::withMessages([
                'appointment' => ['Reviews open after your visit time has passed.'],
            ]);
        }

        if (AppointmentReview::query()->where('appointment_id', $appointment->id)->exists()) {
            throw ValidationException::withMessages([
                'appointment' => ['You already left a review for this visit.'],
            ]);
        }

        return AppointmentReview::query()->create([
            'appointment_id' => $appointment->id,
            'barber_user_id' => (int) $appointment->barber_user_id,
            'customer_user_id' => (int) $customer->id,
            'rating' => $data['rating'],
            'body' => $data['body'],
            'verified_at' => $now,
            'is_published' => true,
        ]);
    }
}
