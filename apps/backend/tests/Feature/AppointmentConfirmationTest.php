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

class AppointmentConfirmationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 5, 10, 6, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function makeBookable(int $deposit = 0): array
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
            'name' => 'Premium Fade',
            'duration_minutes' => 30,
            'is_active' => true,
            'deposit_cents' => $deposit,
        ]);

        return [$barber, $profile, $service];
    }

    public function test_calendar_link_returns_signed_url_for_participant(): void
    {
        [$barber, , $service] = $this->makeBookable();
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/calendar-url")
            ->assertOk();

        $url = (string) $response->json('url');
        $this->assertStringContainsString('signature=', $url);
        $this->assertStringContainsString("/api/v1/appointments/{$appt->id}/calendar.ics", $url);
    }

    public function test_calendar_link_forbidden_for_other_user(): void
    {
        [$barber, , $service] = $this->makeBookable();
        $customer = User::factory()->create();
        $other = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($other, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/calendar-url")
            ->assertForbidden();
    }

    public function test_signed_calendar_route_returns_ics_body(): void
    {
        [$barber, , $service] = $this->makeBookable();
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $url = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/calendar-url")
            ->json('url');

        // Strip the absolute prefix so the test client can use the signed path.
        $path = parse_url((string) $url, PHP_URL_PATH);
        $query = parse_url((string) $url, PHP_URL_QUERY);
        $relative = $path.'?'.$query;

        $response = $this->get($relative);
        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/calendar; charset=UTF-8');
        $response->assertHeader(
            'Content-Disposition',
            sprintf('attachment; filename="ozilcuts-appointment-%d.ics"', $appt->id),
        );

        $body = $response->getContent();
        $this->assertStringContainsString("BEGIN:VCALENDAR\r\n", $body);
        $this->assertStringContainsString('SUMMARY:Premium Fade with '.$barber->name, $body);
        $this->assertStringContainsString('STATUS:CONFIRMED', $body);
        $this->assertStringContainsString('DTSTART:20260511T090000Z', $body);
        $this->assertStringContainsString('DTEND:20260511T093000Z', $body);
        $this->assertStringContainsString("END:VCALENDAR\r\n", $body);
    }

    public function test_unsigned_calendar_route_rejected(): void
    {
        [$barber, , $service] = $this->makeBookable();
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->get("/api/v1/appointments/{$appt->id}/calendar.ics")
            ->assertForbidden();
    }

    public function test_payment_intent_endpoint_returns_secret_for_customer(): void
    {
        [$barber, , $service] = $this->makeBookable(deposit: 1500);
        $customer = User::factory()->create();

        $stripe = new FakeStripeGateway;
        $this->app->instance(StripeGateway::class, $stripe);
        $this->app->instance(
            PaymentService::class,
            new PaymentService($stripe, 'usd'),
        );
        config()->set('services.stripe.publishable', 'pk_test_x');

        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'deposit_cents' => 1500,
            'payment_status' => Appointment::PAYMENT_REQUIRES_PAYMENT,
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/payment-intent")
            ->assertOk()
            ->assertJsonPath('enabled', true)
            ->assertJsonPath('publishable_key', 'pk_test_x')
            ->assertJsonPath('deposit_cents', 1500);

        $secret = $response->json('client_secret');
        $this->assertIsString($secret);
        $this->assertStringStartsWith('pi_test_', $secret);
        $this->assertCount(1, $stripe->createdIntents);
    }

    public function test_payment_intent_endpoint_hides_secret_from_non_customer_participant(): void
    {
        [$barber, , $service] = $this->makeBookable(deposit: 1500);
        $customer = User::factory()->create();

        $stripe = new FakeStripeGateway;
        $this->app->instance(StripeGateway::class, $stripe);
        $this->app->instance(
            PaymentService::class,
            new PaymentService($stripe, 'usd'),
        );

        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'deposit_cents' => 1500,
            'payment_status' => Appointment::PAYMENT_REQUIRES_PAYMENT,
        ]);

        $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/payment-intent")
            ->assertOk()
            ->assertJsonPath('client_secret', null);

        $this->assertCount(0, $stripe->createdIntents);
    }
}
