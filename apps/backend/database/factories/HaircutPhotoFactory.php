<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\HaircutPhoto;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HaircutPhoto>
 */
class HaircutPhotoFactory extends Factory
{
    protected $model = HaircutPhoto::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'appointment_id' => Appointment::factory(),
            'uploaded_by_user_id' => User::factory()->barber(),
            'kind' => fake()->randomElement(HaircutPhoto::KINDS),
            'disk' => 'local',
            'path' => 'haircut-photos/0/'.fake()->uuid().'.jpg',
            'original_name' => fake()->word().'.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => fake()->numberBetween(50_000, 500_000),
            'caption' => fake()->optional(0.5)->sentence(),
            'is_public' => false,
            'customer_consent' => false,
        ];
    }

    public function publishedWithConsent(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_public' => true,
            'customer_consent' => true,
        ]);
    }
}
