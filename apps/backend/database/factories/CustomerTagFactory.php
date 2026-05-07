<?php

namespace Database\Factories;

use App\Models\CustomerTag;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomerTag>
 */
class CustomerTagFactory extends Factory
{
    protected $model = CustomerTag::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_user_id' => User::factory(),
            'created_by_user_id' => User::factory()->barber(),
            'label' => CustomerTag::normalizeLabel(fake()->randomElement([
                'vip',
                'sensitive scalp',
                'long hair',
                'no fragrance',
                'frequent',
            ])),
        ];
    }
}
