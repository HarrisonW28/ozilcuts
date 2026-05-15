<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AppointmentMessagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 6, 10, 14, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_messages_require_auth(): void
    {
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->getJson("/api/v1/appointments/{$appt->id}/messages")
            ->assertUnauthorized();
    }

    public function test_non_participant_cannot_view_thread(): void
    {
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $stranger = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/messages")
            ->assertForbidden();
    }

    public function test_customer_and_barber_can_exchange_messages(): void
    {
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/messages", [
                'kind' => 'operational',
                'operational_key' => 'running_5',
            ])
            ->assertCreated()
            ->assertJsonPath('message.kind', 'operational')
            ->assertJsonPath('message.operational_key', 'running_5');

        $list = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/messages")
            ->assertOk()
            ->json();

        $this->assertCount(1, $list['messages']);
        $this->assertSame(1, $list['meta']['unread_from_others']);
        $this->assertTrue($list['meta']['can_send']);
        $this->assertContains('outside_now', $list['meta']['operational_keys']);
        $this->assertContains('preset_thanks', $list['meta']['preset_keys']);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/messages/read", [
                'last_read_message_id' => $list['messages'][0]['id'],
            ])
            ->assertOk();

        $afterRead = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/messages")
            ->assertOk()
            ->json();
        $this->assertSame(0, $afterRead['meta']['unread_from_others']);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/messages", [
                'kind' => 'preset',
                'preset_key' => 'preset_thanks',
            ])
            ->assertCreated()
            ->assertJsonPath('message.kind', 'preset')
            ->assertJsonPath('message.preset_key', 'preset_thanks');
    }

    public function test_customer_cannot_use_shop_preset_keys(): void
    {
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/messages", [
                'kind' => 'preset',
                'preset_key' => 'preset_got_it',
            ])
            ->assertStatus(422);
    }

    public function test_cancelled_thread_is_read_only(): void
    {
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CANCELLED,
        ]);

        $list = $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/messages")
            ->assertOk()
            ->json();
        $this->assertFalse($list['meta']['can_send']);
        $this->assertSame('cancelled', $list['meta']['thread_closed_reason']);

        $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/messages", [
                'kind' => 'note',
                'body' => 'Hello',
            ])
            ->assertForbidden();
    }

    public function test_operational_keys_are_ordered_for_shop(): void
    {
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $list = $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/messages")
            ->assertOk()
            ->json();

        $keys = $list['meta']['operational_keys'];
        $this->assertNotEmpty($keys);
        $this->assertSame('running_5', $keys[0]);
        $this->assertSame('preset_got_it', $list['meta']['preset_keys'][0]);
        $this->assertFalse($list['meta']['in_arrival_messaging_window']);
    }

    public function test_guest_operational_keys_boost_arrival_chips_in_arrival_window(): void
    {
        Carbon::setTestNow(CarbonImmutable::create(2026, 6, 11, 11, 0, 0));
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $list = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/messages")
            ->assertOk()
            ->json();

        $this->assertTrue($list['meta']['in_arrival_messaging_window']);
        $keys = $list['meta']['operational_keys'];
        $this->assertSame('arriving_now', $keys[0]);
        $this->assertContains('eta_about_3', $keys);
    }

    public function test_shop_operational_keys_put_ready_relaxed_first_in_arrival_window(): void
    {
        Carbon::setTestNow(CarbonImmutable::create(2026, 6, 11, 11, 0, 0));
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $list = $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/messages")
            ->assertOk()
            ->json();

        $this->assertTrue($list['meta']['in_arrival_messaging_window']);
        $this->assertSame('ready_relaxed', $list['meta']['operational_keys'][0]);
    }

    public function test_customer_cannot_use_shop_operational_keys(): void
    {
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/messages", [
                'kind' => 'operational',
                'operational_key' => 'running_5',
            ])
            ->assertStatus(422);
    }

    public function test_stranger_cannot_mark_read(): void
    {
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $stranger = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $mid = (int) $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/messages", [
                'kind' => 'note',
                'body' => 'Hi',
            ])
            ->assertCreated()
            ->json('message.id');

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/messages/read", [
                'last_read_message_id' => $mid,
            ])
            ->assertForbidden();
    }
}
