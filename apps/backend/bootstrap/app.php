<?php

use App\Exceptions\AbuseBlockedException;
use App\Http\Middleware\ForceHttps;
use App\Http\Middleware\OptionalSanctumBearer;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // SPA uses Bearer tokens in storage (not cookie sessions). Stateful
        // Sanctum remains for OAuth redirect flows; CSRF applies only to
        // cookie-backed stateful requests, not Authorization header calls.
        $middleware->statefulApi();
        $middleware->append(ForceHttps::class);
        $middleware->append(SecurityHeaders::class);

        $trusted = (string) env('SECURITY_TRUSTED_PROXIES', '');
        if ($trusted !== '') {
            $middleware->trustProxies(at: $trusted === '*' ? '*' : explode(',', $trusted));
        }
        $middleware->validateCsrfTokens(except: [
            'api/v1/stripe/webhook',
        ]);
        $middleware->alias([
            'optional.sanctum' => OptionalSanctumBearer::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->renderable(function (AbuseBlockedException $e, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            $response = response()->json([
                'message' => $e->getMessage(),
                'code' => $e->abuseCode,
            ], 429);

            if ($e->retryAfterSeconds !== null) {
                $response->headers->set('Retry-After', (string) $e->retryAfterSeconds);
            }

            return $response;
        });
    })->create();
