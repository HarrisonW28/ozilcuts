<?php

namespace Database\Factories;

use App\Models\BarberProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BarberProfile>
 */
class BarberProfileFactory extends Factory
{
    protected $model = BarberProfile::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->barber(),
            'title' => fake()->optional(0.85)->randomElement(['Master barber', 'Senior stylist', 'Lead barber', 'Barber']),
            'bio' => fake()->optional(0.9)->paragraph(),
            'years_experience' => fake()->optional(0.8)->numberBetween(1, 20),
            'is_published' => true,
        ];
    }

    public function unpublished(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_published' => false,
        ]);
    }
}
