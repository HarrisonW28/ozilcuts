<?php

namespace App\Services\Payments;

use App\Models\Appointment;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class PaymentService
{
    public function __construct(
        private readonly StripeGateway $gateway,
        private readonly string $currency,
    ) {}

    public function isEnabled(): bool
    {
        return $this->gateway->isConfigured();
    }

    public function currency(): string
    {
        return $this->currency;
    }

    /**
     * Ensure a Stripe PaymentIntent exists for the deposit on this appointment.
     *
     * Returns the client secret so the caller can hand it to Stripe.js. When
     * the appointment has no deposit or Stripe isn't configured, the appointment
     * stays in `not_required` and the method returns null.
     */
    public function ensureDepositIntent(Appointment $appointment): ?string
    {
        $deposit = (int) $appointment->deposit_cents;
        if ($deposit <= 0) {
            $this->markNotRequired($appointment);

            return null;
        }

        if (! $this->isEnabled()) {
            // Deposit is owed but the gateway isn't reachable in this environment.
            // Surface the requirement so admins can collect it manually.
            $appointment->forceFill([
                'payment_status' => Appointment::PAYMENT_REQUIRES_PAYMENT,
            ])->save();

            return null;
        }

        if (
            $appointment->payment_intent_id !== null
            && in_array($appointment->payment_status, [
                Appointment::PAYMENT_REQUIRES_PAYMENT,
                Appointment::PAYMENT_PROCESSING,
            ], true)
        ) {
            // Reuse existing intent for the same booking.
            return null;
        }

        $intent = $this->gateway->createPaymentIntent(
            $deposit,
            $this->currency,
            [
                'appointment_id' => (string) $appointment->id,
                'customer_user_id' => (string) $appointment->customer_user_id,
                'barber_user_id' => (string) $appointment->barber_user_id,
            ],
        );

        $appointment->forceFill([
            'payment_intent_id' => $intent['id'],
            'payment_status' => Appointment::PAYMENT_REQUIRES_PAYMENT,
        ])->save();

        return $intent['client_secret'];
    }

    /**
     * Issue a refund on cancellation if the deposit was actually captured.
     */
    public function refundForCancellation(Appointment $appointment): void
    {
        if (! $this->isEnabled()) {
            return;
        }
        if ($appointment->payment_status !== Appointment::PAYMENT_PAID) {
            return;
        }
        if ($appointment->payment_intent_id === null) {
            return;
        }

        $refund = $this->gateway->refundPaymentIntent($appointment->payment_intent_id);

        DB::transaction(function () use ($appointment, $refund): void {
            $appointment->forceFill([
                'payment_status' => Appointment::PAYMENT_REFUNDED,
                'refunded_at' => now(),
            ])->save();
            unset($refund); // refund payload retained only for future audit hooks
        });
    }

    /**
     * Verify and apply a Stripe webhook event. Returns the appointment that
     * changed (if any).
     */
    public function handleWebhook(string $payload, string $signatureHeader): ?Appointment
    {
        if (! $this->isEnabled()) {
            throw new RuntimeException('Payments are not configured.');
        }

        $event = $this->gateway->constructEvent($payload, $signatureHeader);
        $intentId = $event['payment_intent_id'];
        if ($intentId === null) {
            return null;
        }

        $appointment = Appointment::query()
            ->where('payment_intent_id', $intentId)
            ->first();
        if ($appointment === null) {
            return null;
        }

        switch ($event['type']) {
            case 'payment_intent.succeeded':
                $appointment->forceFill([
                    'payment_status' => Appointment::PAYMENT_PAID,
                    'amount_paid_cents' => $event['amount_received'] ?? $appointment->deposit_cents,
                    'paid_at' => now(),
                ])->save();
                break;

            case 'payment_intent.processing':
                $appointment->forceFill([
                    'payment_status' => Appointment::PAYMENT_PROCESSING,
                ])->save();
                break;

            case 'payment_intent.payment_failed':
                $appointment->forceFill([
                    'payment_status' => Appointment::PAYMENT_FAILED,
                ])->save();
                break;

            case 'charge.refunded':
            case 'payment_intent.canceled':
                $appointment->forceFill([
                    'payment_status' => Appointment::PAYMENT_REFUNDED,
                    'refunded_at' => now(),
                ])->save();
                break;
        }

        return $appointment->refresh();
    }

    private function markNotRequired(Appointment $appointment): void
    {
        if ($appointment->payment_status === Appointment::PAYMENT_NOT_REQUIRED) {
            return;
        }
        $appointment->forceFill([
            'payment_status' => Appointment::PAYMENT_NOT_REQUIRED,
        ])->save();
    }
}
