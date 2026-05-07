<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\Service;
use App\Models\User;
use App\Services\Payments\PaymentService;
use App\Services\Payments\StripeGateway;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\FakeStripeGateway;
use Tests\TestCase;

class PaymentsTest extends TestCase
{
    use RefreshDatabase;

    private FakeStripeGateway $stripe;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 5, 10, 6, 0, 0));

        config()->set('services.stripe.publishable', 'pk_test_x');
        config()->set('services.stripe.currency', 'usd');

        $this->stripe = new FakeStripeGateway;
        $this->app->instance(StripeGateway::class, $this->stripe);
        $this->app->instance(
            PaymentService::class,
            new PaymentService($this->stripe, 'usd'),
        );
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{User, BarberProfile, Service}
     */
    private function makeBookableBarberWithDeposit(int $deposit = 1500): array
    {
        $barber = User::factory()->barber()->create();
        $profile = BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
        ]);
        BarberAvailabilityWindow::query()->create([
            'barber_profile_id' => $profile->id,
            'weekday' => 1,
            'starts_at' => '09:00:00',
            'ends_at' => '12:00:00',
        ]);
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'is_active' => true,
            'deposit_cents' => $deposit,
        ]);

        return [$barber, $profile, $service];
    }

    public function test_payment_config_endpoint_reports_publishable_key_when_enabled(): void
    {
        $this->getJson('/api/v1/payments/config')
            ->assertOk()
            ->assertJson([
                'enabled' => true,
                'publishable_key' => 'pk_test_x',
                'currency' => 'usd',
            ]);
    }

    public function test_payment_config_endpoint_when_disabled(): void
    {
        $this->stripe->configured = false;
        config()->set('services.stripe.publishable', null);

        $this->getJson('/api/v1/payments/config')
            ->assertOk()
            ->assertJsonPath('enabled', false)
            ->assertJsonPath('publishable_key', null);
    }

    public function test_booking_with_deposit_returns_client_secret_and_creates_intent(): void
    {
        [$barber, , $service] = $this->makeBookableBarberWithDeposit(1500);
        $customer = User::factory()->create();

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertCreated()
            ->assertJsonPath('deposit_cents', 1500)
            ->assertJsonPath('payment_status', Appointment::PAYMENT_REQUIRES_PAYMENT)
            ->assertJsonPath('payment.enabled', true)
            ->assertJsonPath('payment.publishable_key', 'pk_test_x');

        $clientSecret = $response->json('payment.client_secret');
        $this->assertIsString($clientSecret);
        $this->assertStringStartsWith('pi_test_', $clientSecret);

        $this->assertCount(1, $this->stripe->createdIntents);
        $this->assertSame(1500, $this->stripe->createdIntents[0]['amount']);
        $this->assertSame('usd', $this->stripe->createdIntents[0]['currency']);
        $this->assertSame(
            (string) $customer->id,
            $this->stripe->createdIntents[0]['metadata']['customer_user_id'] ?? null,
        );
    }

    public function test_booking_without_deposit_skips_stripe(): void
    {
        [$barber, , $service] = $this->makeBookableBarberWithDeposit(0);
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertCreated()
            ->assertJsonPath('deposit_cents', 0)
            ->assertJsonPath('payment_status', Appointment::PAYMENT_NOT_REQUIRED)
            ->assertJsonPath('payment.client_secret', null);

        $this->assertCount(0, $this->stripe->createdIntents);
    }

    public function test_webhook_marks_appointment_paid(): void
    {
        [$barber, , $service] = $this->makeBookableBarberWithDeposit(1500);
        $customer = User::factory()->create();

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertCreated();

        $appointmentId = (int) $response->json('id');
        $intentId = Appointment::query()->find($appointmentId)?->payment_intent_id;
        $this->assertNotNull($intentId);

        $this->stripe->queuedEvents[] = [
            'type' => 'payment_intent.succeeded',
            'payment_intent_id' => $intentId,
            'amount_received' => 1500,
        ];

        $this->postJson('/api/v1/stripe/webhook', [], [
            'Stripe-Signature' => 'test',
        ])->assertOk()->assertJsonPath('received', true);

        $this->assertDatabaseHas('appointments', [
            'id' => $appointmentId,
            'payment_status' => Appointment::PAYMENT_PAID,
            'amount_paid_cents' => 1500,
        ]);
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        $this->stripe->signatureValid = false;

        $this->postJson('/api/v1/stripe/webhook', [], [
            'Stripe-Signature' => 'bogus',
        ])->assertStatus(400);
    }

    public function test_webhook_503_when_payments_disabled(): void
    {
        $this->stripe->configured = false;

        $this->postJson('/api/v1/stripe/webhook', [], [
            'Stripe-Signature' => 'sig',
        ])->assertStatus(503);
    }

    public function test_cancel_paid_appointment_issues_refund(): void
    {
        [$barber, , $service] = $this->makeBookableBarberWithDeposit(2000);
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'deposit_cents' => 2000,
            'payment_status' => Appointment::PAYMENT_PAID,
            'payment_intent_id' => 'pi_existing_123',
            'amount_paid_cents' => 2000,
            'paid_at' => now(),
        ]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/cancel")
            ->assertOk()
            ->assertJsonPath('status', Appointment::STATUS_CANCELLED)
            ->assertJsonPath('payment_status', Appointment::PAYMENT_REFUNDED);

        $this->assertCount(1, $this->stripe->refunds);
        $this->assertSame('pi_existing_123', $this->stripe->refunds[0]['intent']);
    }

    public function test_cancel_unpaid_appointment_does_not_call_refund(): void
    {
        [$barber, , $service] = $this->makeBookableBarberWithDeposit(2000);
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'deposit_cents' => 2000,
            'payment_status' => Appointment::PAYMENT_REQUIRES_PAYMENT,
            'payment_intent_id' => 'pi_unpaid_456',
        ]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/cancel")
            ->assertOk();

        $this->assertCount(0, $this->stripe->refunds);
    }

    public function test_admin_can_set_deposit_when_creating_service(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/manage/services', [
                'name' => 'Premium fade',
                'duration_minutes' => 45,
                'price_cents' => 6000,
                'deposit_cents' => 1500,
            ])
            ->assertCreated()
            ->assertJsonPath('deposit_cents', 1500);
    }

    public function test_create_service_rejects_deposit_above_price(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/manage/services', [
                'name' => 'Cheap',
                'duration_minutes' => 30,
                'price_cents' => 1000,
                'deposit_cents' => 2000,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['deposit_cents']);
    }

    public function test_public_service_response_exposes_deposit_cents(): void
    {
        Service::factory()->create(['deposit_cents' => 750, 'is_active' => true]);

        $this->getJson('/api/v1/services')
            ->assertOk()
            ->assertJsonPath('data.0.deposit_cents', 750);
    }
}
