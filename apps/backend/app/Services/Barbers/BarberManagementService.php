<?php

namespace App\Services\Barbers;

use App\Models\BarberProfile;
use App\Models\Role;
use App\Models\User;
use App\Services\Availability\BarberAvailabilityService;
use Illuminate\Support\Arr;
use RuntimeException;

final class BarberManagementService
{
    /**
     * @param  array{name: string, email: string, password: string, title?: string|null, bio?: string|null, years_experience?: int|null, is_published?: bool}  $data
     */
    public function createBarber(array $data, User $admin): BarberProfile
    {
        $roleId = Role::query()->where('slug', Role::SLUG_BARBER)->value('id');
        if ($roleId === null) {
            throw new RuntimeException('Barber role is not configured.');
        }

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => $data['password'],
            'role_id' => $roleId,
        ]);

        $profile = BarberProfile::query()->create([
            'user_id' => $user->id,
            'title' => $data['title'] ?? null,
            'bio' => $data['bio'] ?? null,
            'years_experience' => $data['years_experience'] ?? null,
            'is_published' => $data['is_published'] ?? true,
        ])->load('user');

        $defaults = $admin->shop_default_hours;
        if (is_array($defaults) && $defaults !== []) {
            app(BarberAvailabilityService::class)->replace($profile, $defaults);
        }

        return $profile->fresh()->load('user');
    }

    /**
     * @param  array{title?: string|null, bio?: string|null, years_experience?: int|null, is_published?: bool, shop_latitude?: float|null, shop_longitude?: float|null}  $data
     */
    public function updateProfile(User $targetUser, array $data, User $actor): BarberProfile
    {
        $profile = $targetUser->barberProfile;
        if ($profile === null) {
            throw new RuntimeException('Barber profile is missing.');
        }

        $payload = Arr::only($data, ['title', 'bio', 'years_experience']);

        if ($actor->isAdmin() && array_key_exists('is_published', $data)) {
            $payload['is_published'] = (bool) $data['is_published'];
        }

        $profile->update($payload);

        if ($actor->isAdmin()) {
            $geo = Arr::only($data, ['shop_latitude', 'shop_longitude']);
            if ($geo !== []) {
                $targetUser->fill($geo);
                $targetUser->save();
            }
        }

        return $profile->fresh()->load('user');
    }
}
