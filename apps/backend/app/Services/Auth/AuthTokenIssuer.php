<?php

namespace App\Services\Auth;

use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Issues Sanctum personal access tokens with configured expiration.
 */
final class AuthTokenIssuer
{
    public function issue(User $user, string $name = 'auth'): string
    {
        $minutes = config('sanctum.expiration');
        if (is_numeric($minutes) && (int) $minutes > 0) {
            $expiresAt = CarbonImmutable::now()->addMinutes((int) $minutes);

            return $user->createToken($name, ['*'], $expiresAt)->plainTextToken;
        }

        return $user->createToken($name)->plainTextToken;
    }
}
