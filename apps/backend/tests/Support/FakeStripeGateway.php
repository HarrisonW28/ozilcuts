<?php

namespace Tests\Support;

use App\Services\Payments\StripeGateway;
use RuntimeException;

/**
 * Hand-rolled in-memory gateway for tests so we never hit the real Stripe API.
 * The fake records every call so assertions can verify the booking flow handed
 * the right amounts/metadata to the gateway.
 */
final class FakeStripeGateway implements StripeGateway
{
    public bool $configured = true;

    /** @var array<int, array{amount: int, currency: string, metadata: array<string, string|int>}> */
    public array $createdIntents = [];

    /** @var array<int, array{intent: string, amount: ?int}> */
    public array $refunds = [];

    /** @var list<array{type: string, payment_intent_id: ?string, amount_received: ?int}> */
    public array $queuedEvents = [];

    private int $intentCounter = 0;

    public bool $signatureValid = true;

    public function isConfigured(): bool
    {
        return $this->configured;
    }

    /**
     * @param  array<string, string|int>  $metadata
     * @return array{id: string, client_secret: string, status: string}
     */
    public function createPaymentIntent(int $amountCents, string $currency, array $metadata): array
    {
        $this->intentCounter++;
        $id = "pi_test_{$this->intentCounter}";
        $this->createdIntents[] = [
            'amount' => $amountCents,
            'currency' => $currency,
            'metadata' => $metadata,
        ];

        return [
            'id' => $id,
            'client_secret' => $id.'_secret_x',
            'status' => 'requires_payment_method',
        ];
    }

    /**
     * @return array{id: string, status: string, amount: int}
     */
    public function refundPaymentIntent(string $paymentIntentId, ?int $amountCents = null): array
    {
        $this->refunds[] = ['intent' => $paymentIntentId, 'amount' => $amountCents];

        return ['id' => 'rf_test_'.count($this->refunds), 'status' => 'succeeded', 'amount' => $amountCents ?? 0];
    }

    /**
     * @return array{type: string, payment_intent_id: ?string, amount_received: ?int}
     */
    public function constructEvent(string $payload, string $signatureHeader): array
    {
        if (! $this->signatureValid) {
            throw new RuntimeException('Invalid signature');
        }

        $event = array_shift($this->queuedEvents);
        if ($event === null) {
            throw new RuntimeException('No fake event queued.');
        }

        return $event;
    }
}
