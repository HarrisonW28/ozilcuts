<?php

namespace Database\Factories;

use App\Models\CustomerProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomerProfile>
 */
class CustomerProfileFactory extends Factory
{
    protected $model = CustomerProfile::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'phone' => fake()->optional(0.7)->phoneNumber(),
            'preferred_barber_user_id' => null,
            'preferences' => fake()->optional(0.6)->sentence(),
            'marketing_opt_in' => fake()->boolean(25),
            'retention_paused' => false,
        ];
    }
}
