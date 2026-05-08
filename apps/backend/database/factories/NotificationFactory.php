<?php

namespace Database\Factories;

use App\Models\Notification;
use App\Models\User;
use App\Notifications\NotificationEvents;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Notification>
 */
class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => NotificationEvents::APPOINTMENT_CONFIRMED,
            'data' => [
                'title' => 'Appointment confirmed',
                'message' => 'Your booking is on the books.',
            ],
            'read_at' => null,
        ];
    }

    public function read(): static
    {
        return $this->state(fn (array $attributes) => [
            'read_at' => now(),
        ]);
    }
}
