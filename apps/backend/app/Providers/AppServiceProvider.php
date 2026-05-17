<?php

namespace App\Providers;

use App\Services\Payments\PaymentService;
use App\Services\Payments\StripeApiGateway;
use App\Services\Payments\StripeGateway;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(StripeGateway::class, function () {
            return new StripeApiGateway(
                secret: (string) config('services.stripe.secret', '') ?: null,
                webhookSecret: (string) config('services.stripe.webhook_secret', '') ?: null,
            );
        });

        $this->app->singleton(PaymentService::class, function ($app) {
            return new PaymentService(
                gateway: $app->make(StripeGateway::class),
                currency: (string) config('services.stripe.currency', 'gbp'),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(static function (): Password {
            return Password::min(8)
                ->letters()
                ->numbers();
        });

        $authLimit = max(5, (int) config('security.rate_limits.auth', 10));
        $authenticatedLimit = max(60, (int) config('security.rate_limits.authenticated_api', 240));
        $publicLimit = max(30, (int) config('security.rate_limits.public_api', 120));

        RateLimiter::for('auth', static function (Request $request) use ($authLimit) {
            return Limit::perMinute($authLimit)->by($request->ip() ?? 'unknown');
        });

        RateLimiter::for('authenticated-api', static function (Request $request) use ($authenticatedLimit) {
            $key = $request->user()?->id ?? $request->ip() ?? 'guest';

            return Limit::perMinute($authenticatedLimit)->by((string) $key);
        });

        RateLimiter::for('public-api', static function (Request $request) use ($publicLimit) {
            return Limit::perMinute($publicLimit)->by($request->ip() ?? 'unknown');
        });

        /** Logo / hero uploads — generous cap so admin settings retries do not hit 10/min. */
        RateLimiter::for('admin-media', static function (Request $request) {
            $key = $request->user()?->id ?? $request->ip() ?? 'guest';

            return Limit::perMinute(60)->by('admin-media:'.(string) $key);
        });
    }
}
