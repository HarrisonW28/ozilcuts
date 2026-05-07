<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(ServiceSeeder::class);
        $this->call(BarberSeeder::class);

        if (! User::query()->where('email', 'admin@example.com')->exists()) {
            User::factory()->admin()->create([
                'name' => 'Shop Admin',
                'email' => 'admin@example.com',
            ]);
        }

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }
}
