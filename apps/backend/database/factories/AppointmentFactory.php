<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Appointment>
 */
class AppointmentFactory extends Factory
{
    protected $model = Appointment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = now()->addDay()->setTime(10, 0);

        return [
            'service_id' => Service::factory(),
            'barber_user_id' => User::factory()->barber(),
            'customer_user_id' => User::factory(),
            'starts_at' => $start,
            'ends_at' => $start->copy()->addMinutes(30),
            'status' => Appointment::STATUS_CONFIRMED,
            'notes' => null,
        ];
    }
}
