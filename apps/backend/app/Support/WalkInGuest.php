<?php

namespace App\Support;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

final class WalkInGuest
{
    public const PLACEHOLDER_EMAIL = 'walk-in-guest@ozilcuts.invalid';

    public static function resolveUser(): User
    {
        $roleId = Role::query()->where('slug', Role::SLUG_CUSTOMER)->value('id');
        if ($roleId === null) {
            throw new RuntimeException('Customer role is not configured.');
        }

        return User::query()->firstOrCreate(
            ['email' => self::PLACEHOLDER_EMAIL],
            [
                'name' => 'Walk-in guest',
                'password' => Hash::make(Str::random(64)),
                'role_id' => $roleId,
            ],
        );
    }

    public static function isPlaceholder(?User $user): bool
    {
        if ($user === null) {
            return false;
        }

        return strtolower((string) $user->email) === self::PLACEHOLDER_EMAIL;
    }
}
