<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\AppointmentReview;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AppointmentReview>
 */
class AppointmentReviewFactory extends Factory
{
    protected $model = AppointmentReview::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $appointment = Appointment::factory()->create();

        return [
            'appointment_id' => $appointment->id,
            'barber_user_id' => $appointment->barber_user_id,
            'customer_user_id' => $appointment->customer_user_id,
            'rating' => fake()->numberBetween(4, 5),
            'body' => fake()->paragraph(2),
            'verified_at' => now(),
            'is_published' => true,
        ];
    }
}
