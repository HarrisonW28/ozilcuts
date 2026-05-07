<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            [
                'name' => 'Classic haircut',
                'slug' => 'classic-haircut',
                'description' => 'Wash, cut, and style for everyday sharpness.',
                'duration_minutes' => 30,
                'price_cents' => 3500,
                'sort_order' => 10,
            ],
            [
                'name' => 'Skin fade',
                'slug' => 'skin-fade',
                'description' => 'Precision taper with a clean skin finish.',
                'duration_minutes' => 45,
                'price_cents' => 4500,
                'sort_order' => 20,
            ],
            [
                'name' => 'Beard trim & line-up',
                'slug' => 'beard-trim-line-up',
                'description' => 'Shape, trim, and razor-sharp edges.',
                'duration_minutes' => 20,
                'price_cents' => 2200,
                'sort_order' => 30,
            ],
            [
                'name' => 'Hot towel shave',
                'slug' => 'hot-towel-shave',
                'description' => 'Traditional straight-razor finish with hot towels.',
                'duration_minutes' => 30,
                'price_cents' => 4000,
                'sort_order' => 40,
            ],
            [
                'name' => 'Kids cut',
                'slug' => 'kids-cut',
                'description' => 'Age 12 and under — patient, quick, and neat.',
                'duration_minutes' => 25,
                'price_cents' => 2800,
                'sort_order' => 50,
            ],
        ];

        foreach ($rows as $row) {
            Service::query()->updateOrCreate(
                ['slug' => $row['slug']],
                [...$row, 'is_active' => true],
            );
        }
    }
}
