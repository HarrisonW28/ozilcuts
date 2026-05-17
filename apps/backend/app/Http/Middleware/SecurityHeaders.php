<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline security headers for API and web responses.
 */
final class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(self), payment=(self)',
        );
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');

        $isPublicMarketingAsset = $request->is('api/v1/public/marketing/asset');

        $response->headers->set(
            'Cross-Origin-Resource-Policy',
            $isPublicMarketingAsset ? 'cross-origin' : 'same-site',
        );

        if ((bool) config('security.headers.enable_csp', true) && ! $request->is('api/*')) {
            $response->headers->set(
                'Content-Security-Policy',
                "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
            );
        }

        if ($request->isSecure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains',
            );
        }

        if ($isPublicMarketingAsset) {
            $response->headers->set('Cache-Control', 'public, max-age=86400');
            $response->headers->remove('Pragma');
        } elseif ($request->is('api/*')) {
            $response->headers->set('Cache-Control', 'no-store, private');
            $response->headers->set('Pragma', 'no-cache');
        }

        return $response;
    }
}
