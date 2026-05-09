<?php

namespace App\Services\Auth;

use App\Exceptions\Auth\OAuthAccountLinkException;
use App\Mail\WelcomeMail;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use RuntimeException;

final class AuthenticationService
{
    public const PROVIDER_GOOGLE = 'google';

    public function register(string $name, string $email, string $password): User
    {
        $roleId = Role::query()->where('slug', Role::SLUG_CUSTOMER)->value('id');
        if ($roleId === null) {
            throw new RuntimeException('Default customer role is not configured.');
        }

        $user = User::create([
            'name' => $name,
            'email' => strtolower($email),
            'password' => $password,
            'role_id' => $roleId,
        ]);

        $this->dispatchWelcomeMail($user);

        return $user;
    }

    public function validateCredentials(string $email, string $password): ?User
    {
        $user = User::query()->where('email', strtolower($email))->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            return null;
        }

        return $user;
    }

    /**
     * Resolve a local user from Google OAuth profile data (id, email, name).
     *
     * @throws OAuthAccountLinkException When the email is already tied to another Google account.
     * @throws RuntimeException When the provider omits an email address.
     */
    public function findOrCreateFromGoogleUser(SocialiteUser $socialiteUser): User
    {
        $email = $socialiteUser->getEmail();
        if ($email === null || $email === '') {
            throw new RuntimeException('Google did not return an email for this account.');
        }

        $email = strtolower($email);
        $providerUserId = (string) $socialiteUser->getId();
        $name = $socialiteUser->getName() ?? explode('@', $email)[0] ?? 'User';

        $byOAuth = User::query()
            ->where('provider', self::PROVIDER_GOOGLE)
            ->where('provider_id', $providerUserId)
            ->first();

        if ($byOAuth !== null) {
            $byOAuth->update([
                'name' => $name,
                'email' => $email,
                'email_verified_at' => $byOAuth->email_verified_at ?? now(),
            ]);

            return $byOAuth->fresh(['role']) ?? $byOAuth;
        }

        $byEmail = User::query()->where('email', $email)->first();

        if ($byEmail !== null) {
            if ($byEmail->provider !== null
                && ($byEmail->provider !== self::PROVIDER_GOOGLE || $byEmail->provider_id !== $providerUserId)) {
                throw new OAuthAccountLinkException(
                    'This email is already registered with a different sign-in method.',
                );
            }

            $byEmail->update([
                'provider' => self::PROVIDER_GOOGLE,
                'provider_id' => $providerUserId,
                'name' => $name,
                'email_verified_at' => $byEmail->email_verified_at ?? now(),
            ]);

            return $byEmail->fresh(['role']) ?? $byEmail;
        }

        return $this->createUserFromGoogle($email, $name, $providerUserId);
    }

    private function createUserFromGoogle(string $email, string $name, string $providerUserId): User
    {
        $roleId = Role::query()->where('slug', Role::SLUG_CUSTOMER)->value('id');
        if ($roleId === null) {
            throw new RuntimeException('Default customer role is not configured.');
        }

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make(bin2hex(random_bytes(32))),
            'provider' => self::PROVIDER_GOOGLE,
            'provider_id' => $providerUserId,
            'role_id' => $roleId,
            'email_verified_at' => now(),
        ]);

        $this->dispatchWelcomeMail($user);

        return $user;
    }

    /**
     * Welcome email is sent once per new account creation. Failures are
     * swallowed so a transient mail driver hiccup never breaks signup.
     */
    private function dispatchWelcomeMail(User $user): void
    {
        try {
            Mail::to($user->email)->queue(new WelcomeMail($user));
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
