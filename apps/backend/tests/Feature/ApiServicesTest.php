<?php

namespace Tests\Feature;

use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiServicesTest extends TestCase
{
    use RefreshDatabase;

    public function test_services_index_returns_only_active_ordered(): void
    {
        Service::factory()->create([
            'name' => 'Zebra cut',
            'slug' => 'zebra-cut',
            'sort_order' => 100,
            'is_active' => true,
        ]);
        Service::factory()->create([
            'name' => 'Alpha cut',
            'slug' => 'alpha-cut',
            'sort_order' => 10,
            'is_active' => true,
        ]);
        Service::factory()->inactive()->create([
            'name' => 'Hidden',
            'slug' => 'hidden-cut',
            'sort_order' => 5,
        ]);

        $response = $this->getJson('/api/v1/services');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.slug', 'alpha-cut')
            ->assertJsonPath('data.1.slug', 'zebra-cut')
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                        'description',
                        'duration_minutes',
                        'price_cents',
                    ],
                ],
            ]);
    }

    public function test_services_index_requires_no_authentication(): void
    {
        Service::factory()->create();

        $this->getJson('/api/v1/services')->assertOk();
    }
}
