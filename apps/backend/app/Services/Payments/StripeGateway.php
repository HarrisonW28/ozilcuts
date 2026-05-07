<?php

namespace App\Services\Payments;

/**
 * Thin contract over the calls we make against Stripe. Tests bind a fake
 * implementation; production binds {@see StripeApiGateway}.
 */
interface StripeGateway
{
    public function isConfigured(): bool;

    /**
     * @param  array<string, string|int>  $metadata
     * @return array{id: string, client_secret: string, status: string}
     */
    public function createPaymentIntent(int $amountCents, string $currency, array $metadata): array;

    /**
     * @return array{id: string, status: string, amount: int}
     */
    public function refundPaymentIntent(string $paymentIntentId, ?int $amountCents = null): array;

    /**
     * Verify a webhook payload using the configured signing secret. The returned
     * shape is normalised so callers don't depend on the SDK type.
     *
     * @return array{type: string, payment_intent_id: ?string, amount_received: ?int}
     */
    public function constructEvent(string $payload, string $signatureHeader): array;
}
