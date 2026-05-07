<?php

namespace Database\Seeders;

use App\Models\BarberProfile;
use App\Models\User;
use Illuminate\Database\Seeder;

class BarberSeeder extends Seeder
{
    public function run(): void
    {
        $barbers = [
            [
                'name' => 'Marcus Reed',
                'title' => 'Master barber',
                'bio' => 'Fades, tapers, and classic scissor work. Ten years behind the chair in downtown shops.',
                'years_experience' => 10,
            ],
            [
                'name' => 'Jordan Lee',
                'title' => 'Senior stylist',
                'bio' => 'Texture-focused cuts and beard sculpting. Book extra time for a full restyle.',
                'years_experience' => 7,
            ],
            [
                'name' => 'Sam Ortiz',
                'title' => 'Lead barber',
                'bio' => 'Kid-friendly cuts and quick lunch-break trims—precision without the wait.',
                'years_experience' => 5,
            ],
        ];

        foreach ($barbers as $row) {
            $user = User::factory()->barber()->create([
                'name' => $row['name'],
            ]);
            BarberProfile::query()->create([
                'user_id' => $user->id,
                'title' => $row['title'],
                'bio' => $row['bio'],
                'years_experience' => $row['years_experience'],
                'is_published' => true,
            ]);
        }
    }
}
