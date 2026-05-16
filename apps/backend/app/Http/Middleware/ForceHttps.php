<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Redirects insecure requests when SECURITY_FORCE_HTTPS is enabled (production TLS termination).
 */
final class ForceHttps
{
    public function handle(Request $request, Closure $next): Response
    {
        if (
            (bool) config('security.production.force_https', false)
            && ! $request->isSecure()
            && app()->environment('production')
        ) {
            return redirect()->secure($request->getRequestUri(), 301);
        }

        return $next($request);
    }
}
