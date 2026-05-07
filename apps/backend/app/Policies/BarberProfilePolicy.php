<?php

namespace App\Policies;

use App\Models\BarberProfile;
use App\Models\Role;
use App\Models\User;

class BarberProfilePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, BarberProfile $barberProfile): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasRole(Role::SLUG_BARBER) && $user->id === $barberProfile->user_id;
    }

    public function createViaAdmin(User $user): bool
    {
        return $user->isAdmin();
    }
}
