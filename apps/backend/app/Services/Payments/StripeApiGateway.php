<?php

namespace App\Services\Payments;

use RuntimeException;
use Stripe\StripeClient;
use Stripe\Webhook;

final class StripeApiGateway implements StripeGateway
{
    private ?StripeClient $client = null;

    public function __construct(
        private readonly ?string $secret,
        private readonly ?string $webhookSecret,
    ) {}

    public function isConfigured(): bool
    {
        return $this->secret !== null && $this->secret !== '';
    }

    /**
     * @param  array<string, string|int>  $metadata
     * @return array{id: string, client_secret: string, status: string}
     */
    public function createPaymentIntent(int $amountCents, string $currency, array $metadata): array
    {
        $intent = $this->client()->paymentIntents->create([
            'amount' => $amountCents,
            'currency' => strtolower($currency),
            'automatic_payment_methods' => ['enabled' => true],
            'metadata' => $metadata,
        ]);

        return [
            'id' => (string) $intent->id,
            'client_secret' => (string) $intent->client_secret,
            'status' => (string) $intent->status,
        ];
    }

    /**
     * @return array{id: string, status: string, amount: int}
     */
    public function refundPaymentIntent(string $paymentIntentId, ?int $amountCents = null): array
    {
        $params = ['payment_intent' => $paymentIntentId];
        if ($amountCents !== null) {
            $params['amount'] = $amountCents;
        }

        $refund = $this->client()->refunds->create($params);

        return [
            'id' => (string) $refund->id,
            'status' => (string) $refund->status,
            'amount' => (int) $refund->amount,
        ];
    }

    /**
     * @return array{type: string, payment_intent_id: ?string, amount_received: ?int}
     */
    public function constructEvent(string $payload, string $signatureHeader): array
    {
        if ($this->webhookSecret === null || $this->webhookSecret === '') {
            throw new RuntimeException('Stripe webhook secret is not configured.');
        }

        $event = Webhook::constructEvent($payload, $signatureHeader, $this->webhookSecret);
        $object = $event->data->object ?? null;

        $intentId = null;
        $received = null;
        if ($object !== null) {
            $intentId = property_exists($object, 'id') ? (string) $object->id : null;
            if (property_exists($object, 'payment_intent') && $object->payment_intent !== null) {
                $intentId = (string) $object->payment_intent;
            }
            if (property_exists($object, 'amount_received')) {
                $received = (int) $object->amount_received;
            } elseif (property_exists($object, 'amount')) {
                $received = (int) $object->amount;
            }
        }

        return [
            'type' => (string) $event->type,
            'payment_intent_id' => $intentId,
            'amount_received' => $received,
        ];
    }

    private function client(): StripeClient
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Stripe is not configured for this environment.');
        }
        if ($this->client === null) {
            $this->client = new StripeClient((string) $this->secret);
        }

        return $this->client;
    }
}
