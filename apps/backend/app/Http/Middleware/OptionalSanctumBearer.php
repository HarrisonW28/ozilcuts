<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * When a valid Bearer token is present, attach the user to the request for
 * optional personalization (routes stay reachable without auth).
 */
final class OptionalSanctumBearer
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if (! is_string($token) || $token === '') {
            return $next($request);
        }

        $accessToken = PersonalAccessToken::findToken($token);
        if ($accessToken === null) {
            return $next($request);
        }

        $user = $accessToken->tokenable;
        if ($user === null) {
            return $next($request);
        }

        auth()->guard('sanctum')->setUser($user);
        $request->setUserResolver(static fn () => $user);

        return $next($request);
    }
}
