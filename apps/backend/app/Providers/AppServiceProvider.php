<?php

namespace App\Providers;

use App\Services\Payments\PaymentService;
use App\Services\Payments\StripeApiGateway;
use App\Services\Payments\StripeGateway;
use Illuminate\Support\ServiceProvider;

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
                currency: (string) config('services.stripe.currency', 'usd'),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
