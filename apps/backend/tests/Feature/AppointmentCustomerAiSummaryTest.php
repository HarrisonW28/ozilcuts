<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\CustomerNote;
use App\Models\HairProfile;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AppointmentCustomerAiSummaryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 8, 10, 11, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        Http::swap(new HttpFactory);
        parent::tearDown();
    }

    private function makeAppt(
        User $barber,
        Service $service,
        ?User $customer,
        string $startsAt,
        string $endsAt,
    ): Appointment {
        return Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer?->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => Appointment::STATUS_CONFIRMED,
            'arrival_state' => Appointment::ARRIVAL_EXPECTED,
            'notes' => null,
            'deposit_cents' => 0,
            'payment_status' => Appointment::PAYMENT_NOT_REQUIRED,
            'amount_paid_cents' => 0,
            'paid_at' => null,
            'refunded_at' => null,
        ]);
    }

    public function test_customer_is_forbidden(): void
    {
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create();
        $appt = $this->makeAppt(
            $barber,
            $service,
            $customer,
            '2026-08-10 14:00:00',
            '2026-08-10 14:30:00',
        );

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/customer-ai-summary")
            ->assertForbidden();
    }

    public function test_other_barber_is_forbidden(): void
    {
        $barberA = User::factory()->barber()->create();
        $barberB = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create();
        $appt = $this->makeAppt(
            $barberA,
            $service,
            $customer,
            '2026-08-10 14:00:00',
            '2026-08-10 14:30:00',
        );

        $this->actingAs($barberB, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/customer-ai-summary")
            ->assertForbidden();
    }

    public function test_assigned_barber_receives_rules_summary(): void
    {
        Config::set('services.openai.api_key', null);

        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create(['name' => 'Jamie Rivers']);
        $service = Service::factory()->create(['name' => 'Fade']);

        $appt = $this->makeAppt(
            $barber,
            $service,
            $customer,
            '2026-08-10 14:00:00',
            '2026-08-10 14:30:00',
        );

        HairProfile::factory()->create([
            'user_id' => $customer->id,
            'hair_type' => 'wavy',
            'styling_notes' => 'Low taper, natural texture.',
        ]);

        CustomerNote::factory()->create([
            'customer_user_id' => $customer->id,
            'author_user_id' => $barber->id,
            'body' => 'Prefers scissors on the neckline.',
            'pinned' => true,
        ]);

        $res = $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/customer-ai-summary")
            ->assertOk()
            ->assertJsonPath('linked_customer', true)
            ->assertJsonPath('source', 'rules');

        $hair = $res->json('sections.hair_preferences');
        $this->assertIsString($hair);
        $this->assertStringContainsString('wavy', $hair);
        $notes = $res->json('sections.notes_digest');
        $this->assertIsString($notes);
        $this->assertStringContainsString('neckline', $notes);
        $staff = $res->json('privacy.staff_only');
        $this->assertIsString($staff);
        $this->assertGreaterThan(10, strlen($staff));
    }

    public function test_guest_requires_authentication(): void
    {
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create();
        $appt = $this->makeAppt(
            $barber,
            $service,
            $customer,
            '2026-08-10 14:00:00',
            '2026-08-10 14:30:00',
        );

        $this->getJson("/api/v1/appointments/{$appt->id}/customer-ai-summary")
            ->assertUnauthorized();
    }

    public function test_admin_can_load_summary(): void
    {
        Config::set('services.openai.api_key', null);

        $barber = User::factory()->barber()->create();
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create();
        $appt = $this->makeAppt(
            $barber,
            $service,
            $customer,
            '2026-08-10 14:00:00',
            '2026-08-10 14:30:00',
        );

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/customer-ai-summary")
            ->assertOk()
            ->assertJsonPath('linked_customer', true);
    }

    public function test_uses_openai_when_configured(): void
    {
        Config::set('services.openai.api_key', 'sk-test-key');
        Config::set('services.openai.model', 'gpt-4o-mini');

        Http::fake([
            'api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'hair_preferences' => 'Wavy hair, prefers low maintenance shape.',
                            'visit_summary' => 'Regular guest with steady booking rhythm.',
                            'notes_digest' => 'Pinned: neckline detail.',
                            'operational_signals' => 'Chair is busy; guest can check in when ready.',
                        ]),
                    ],
                ]],
            ], 200),
        ]);

        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create(['name' => 'Alex']);
        $service = Service::factory()->create(['name' => 'Cut']);
        $appt = $this->makeAppt(
            $barber,
            $service,
            $customer,
            '2026-08-10 14:00:00',
            '2026-08-10 14:30:00',
        );

        $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/customer-ai-summary")
            ->assertOk()
            ->assertJsonPath('source', 'model')
            ->assertJsonPath('sections.visit_summary', 'Regular guest with steady booking rhythm.');
    }
}
