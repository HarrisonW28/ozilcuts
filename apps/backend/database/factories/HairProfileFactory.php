<?php

namespace Database\Factories;

use App\Models\HairProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HairProfile>
 */
class HairProfileFactory extends Factory
{
    protected $model = HairProfile::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'hair_type' => fake()->randomElement(HairProfile::HAIR_TYPES),
            'hair_thickness' => fake()->randomElement(HairProfile::HAIR_THICKNESSES),
            'hair_length' => fake()->randomElement(HairProfile::HAIR_LENGTHS),
            'scalp_condition' => fake()->randomElement(HairProfile::SCALP_CONDITIONS),
            'preferred_clipper_guard' => fake()->optional(0.6)->randomElement(['#1', '#2', '#3', '#4', 'fade', 'scissor only']),
            'allergies' => fake()->optional(0.2)->sentence(),
            'styling_notes' => fake()->optional(0.6)->sentence(),
        ];
    }
}
