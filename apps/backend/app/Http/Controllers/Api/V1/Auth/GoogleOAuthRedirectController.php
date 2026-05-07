<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;

final class GoogleOAuthRedirectController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        if (! config('services.google.client_id') || ! config('services.google.client_secret')) {
            abort(503, 'Google sign-in is not configured.');
        }

        return Socialite::driver('google')->stateless()->redirect();
    }
}
