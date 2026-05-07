<?php

namespace Database\Factories;

use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BarberAvailabilityWindow>
 */
class BarberAvailabilityWindowFactory extends Factory
{
    protected $model = BarberAvailabilityWindow::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'barber_profile_id' => BarberProfile::factory(),
            'weekday' => fake()->numberBetween(0, 6),
            'starts_at' => '09:00:00',
            'ends_at' => '17:00:00',
        ];
    }
}
