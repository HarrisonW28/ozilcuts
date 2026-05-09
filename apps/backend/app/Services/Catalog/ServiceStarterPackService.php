<?php

namespace App\Services\Catalog;

use App\Models\Service;

final class ServiceStarterPackService
{
    /**
     * Opinionated defaults for new barbershops (Sprint 15.1).
     *
     * @return array{created: list<array{name: string, slug: string}>, skipped: list<string>}
     */
    public function apply(): array
    {
        $templates = [
            [
                'name' => 'Haircut',
                'slug' => 'haircut',
                'description' => null,
                'duration_minutes' => 30,
                'price_cents' => 3500,
                'deposit_cents' => 500,
                'deposit_policy' => Service::DEPOSIT_POLICY_FIRST_TIME_CUSTOMER,
                'sort_order' => 10,
            ],
            [
                'name' => 'Skin Fade',
                'slug' => 'skin-fade',
                'description' => null,
                'duration_minutes' => 45,
                'price_cents' => 4500,
                'deposit_cents' => 500,
                'deposit_policy' => Service::DEPOSIT_POLICY_FIRST_TIME_CUSTOMER,
                'sort_order' => 20,
            ],
            [
                'name' => 'Hair + Beard',
                'slug' => 'hair-beard',
                'description' => null,
                'duration_minutes' => 45,
                'price_cents' => 5000,
                'deposit_cents' => 500,
                'deposit_policy' => Service::DEPOSIT_POLICY_FIRST_TIME_CUSTOMER,
                'sort_order' => 30,
            ],
            [
                'name' => 'Beard Trim',
                'slug' => 'beard-trim',
                'description' => null,
                'duration_minutes' => 20,
                'price_cents' => 2000,
                'deposit_cents' => 0,
                'deposit_policy' => Service::DEPOSIT_POLICY_ALWAYS,
                'sort_order' => 40,
            ],
        ];

        $management = new ServiceManagementService();
        $created = [];
        $skipped = [];

        foreach ($templates as $row) {
            if (Service::query()->where('slug', $row['slug'])->exists()) {
                $skipped[] = $row['slug'];

                continue;
            }

            $management->create($row);
            $created[] = ['name' => $row['name'], 'slug' => $row['slug']];
        }

        return ['created' => $created, 'skipped' => $skipped];
    }
}
