<?php

namespace App\Services\Catalog;

use App\Models\Service;
use Illuminate\Support\Str;

final class ServiceManagementService
{
    /**
     * @param  array{name: string, slug?: string|null, description?: string|null, duration_minutes: int, price_cents: int, deposit_cents?: int, sort_order?: int, is_active?: bool}  $data
     */
    public function create(array $data): Service
    {
        $slug = isset($data['slug']) && $data['slug'] !== ''
            ? $data['slug']
            : $this->uniqueSlugFromName($data['name']);

        return Service::query()->create([
            'name' => $data['name'],
            'slug' => $slug,
            'description' => $data['description'] ?? null,
            'duration_minutes' => $data['duration_minutes'],
            'price_cents' => $data['price_cents'],
            'deposit_cents' => $data['deposit_cents'] ?? 0,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    /**
     * @param  array{name?: string, slug?: string|null, description?: string|null, duration_minutes?: int, price_cents?: int, deposit_cents?: int, sort_order?: int, is_active?: bool}  $data
     */
    public function update(Service $service, array $data): Service
    {
        $payload = array_intersect_key($data, array_flip([
            'name',
            'slug',
            'description',
            'duration_minutes',
            'price_cents',
            'deposit_cents',
            'sort_order',
            'is_active',
        ]));

        if (
            array_key_exists('slug', $payload)
            && ($payload['slug'] === '' || $payload['slug'] === null)
        ) {
            $payload['slug'] = $this->uniqueSlugFromName(
                $payload['name'] ?? $service->name,
                $service->id,
            );
        }

        $service->update($payload);

        return $service->fresh();
    }

    private function uniqueSlugFromName(string $name, ?int $exceptServiceId = null): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'service';
        }

        $slug = $base;
        $i = 1;
        while (
            Service::query()
                ->when(
                    $exceptServiceId !== null,
                    fn ($q) => $q->where('id', '!=', $exceptServiceId),
                )
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }
}
