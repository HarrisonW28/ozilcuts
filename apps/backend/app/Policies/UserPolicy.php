<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;

class UserPolicy
{
    public function useStaffCrmTools(User $user): bool
    {
        return $user->hasRole(Role::SLUG_BARBER) || $user->isAdmin();
    }

    public function viewStaffCrm(User $actor, User $customer): bool
    {
        return $this->staffCanAccessCustomer($actor, $customer);
    }

    public function manageStaffCrm(User $actor, User $customer): bool
    {
        return $this->staffCanAccessCustomer($actor, $customer);
    }

    private function staffCanAccessCustomer(User $actor, User $customer): bool
    {
        if (! $actor->hasRole(Role::SLUG_BARBER) && ! $actor->isAdmin()) {
            return false;
        }

        $customer->loadMissing('role');

        return $customer->hasRole(Role::SLUG_CUSTOMER);
    }

    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, User $model): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->id === $model->id;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, User $model): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->id === $model->id;
    }

    public function delete(User $user, User $model): bool
    {
        if (! $user->isAdmin()) {
            return false;
        }

        return $user->id !== $model->id;
    }
}
