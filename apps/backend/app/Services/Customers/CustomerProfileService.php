<?php

namespace App\Services\Customers;

use App\Models\CustomerProfile;
use App\Models\Role;
use App\Models\User;
use RuntimeException;

final class CustomerProfileService
{
    public function findOrCreateFor(User $user): CustomerProfile
    {
        $user->loadMissing('role');
        if (! $user->hasRole(Role::SLUG_CUSTOMER)) {
            throw new RuntimeException('Only customer accounts have customer profiles.');
        }

        return CustomerProfile::query()->firstOrCreate([
            'user_id' => $user->id,
        ])->refresh();
    }

    /**
     * @param  array{phone?: string|null, date_of_birth?: string|null, preferred_barber_user_id?: int|null, preferences?: string|null, marketing_opt_in?: bool, retention_paused?: bool, arrival_location_opt_in?: bool}  $data
     */
    public function update(CustomerProfile $profile, array $data): CustomerProfile
    {
        $profile->update(array_intersect_key($data, array_flip([
            'phone',
            'date_of_birth',
            'preferred_barber_user_id',
            'preferences',
            'marketing_opt_in',
            'retention_paused',
            'arrival_location_opt_in',
        ])));

        return $profile->fresh(['user', 'preferredBarber']);
    }
}
