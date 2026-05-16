<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Exceptions\Auth\OAuthAccountLinkException;
use App\Http\Controllers\Controller;
use App\Services\Auth\AuthTokenIssuer;
use App\Services\Auth\AuthenticationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Throwable;

final class GoogleOAuthCallbackController extends Controller
{
    public function __invoke(AuthenticationService $auth, AuthTokenIssuer $tokens): RedirectResponse
    {
        if (! config('services.google.client_id') || ! config('services.google.client_secret')) {
            abort(503, 'Google sign-in is not configured.');
        }

        try {
            $socialiteUser = Socialite::driver('google')->stateless()->user();
        } catch (InvalidStateException $e) {
            return $this->redirectToFrontend(['error' => 'oauth_state']);
        } catch (Throwable $e) {
            Log::warning('Google OAuth callback failed', ['exception' => $e]);

            return $this->redirectToFrontend(['error' => 'oauth_failed']);
        }

        try {
            $user = $auth->findOrCreateFromGoogleUser($socialiteUser);
        } catch (OAuthAccountLinkException $e) {
            return $this->redirectToFrontend(['error' => 'account_conflict']);
        } catch (Throwable $e) {
            Log::warning('Google OAuth user resolution failed', ['exception' => $e]);

            return $this->redirectToFrontend(['error' => 'oauth_failed']);
        }

        $user->load('role');
        $token = $tokens->issue($user);

        return $this->redirectToFrontend(['token' => $token]);
    }

    /**
     * @param  array<string, mixed>  $fragmentParams
     */
    private function redirectToFrontend(array $fragmentParams): RedirectResponse
    {
        $base = config('services.frontend.url');
        $target = $base.'/auth/callback';
        $fragment = http_build_query($fragmentParams, '', '&', PHP_QUERY_RFC3986);

        return redirect()->away($target.'#'.$fragment);
    }
}
