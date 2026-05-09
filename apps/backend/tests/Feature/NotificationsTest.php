<?php

namespace Tests\Feature;

use App\Mail\AppointmentConfirmedMail;
use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\Service;
use App\Models\User;
use App\Notifications\NotificationChannels;
use App\Notifications\NotificationEvents;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 5, 10, 6, 0, 0));
        Mail::fake();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{User, Service}
     */
    private function makeBookable(): array
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
        ]);

        return [$barber, $service];
    }

    public function test_index_requires_authentication(): void
    {
        $this->getJson('/api/v1/notifications')->assertUnauthorized();
    }

    public function test_index_returns_only_signed_in_users_notifications(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        Notification::factory()->count(2)->create(['user_id' => $userA->id]);
        Notification::factory()->count(3)->create(['user_id' => $userB->id]);

        $response = $this->actingAs($userA, 'sanctum')
            ->getJson('/api/v1/notifications')
            ->assertOk()
            ->json();

        $this->assertSame(2, count($response['data']));
        foreach ($response['data'] as $row) {
            $this->assertContains(
                $row['type'],
                NotificationEvents::ALL,
            );
        }
    }

    public function test_index_can_filter_unread(): void
    {
        $user = User::factory()->create();
        Notification::factory()->count(2)->create(['user_id' => $user->id]);
        Notification::factory()->read()->count(3)->create(['user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/notifications?unread=1')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_unread_count_endpoint(): void
    {
        $user = User::factory()->create();
        Notification::factory()->count(4)->create(['user_id' => $user->id]);
        Notification::factory()->read()->count(2)->create(['user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('unread', 4);
    }

    public function test_mark_read_only_owner_can_mark_their_own(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $note = Notification::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other, 'sanctum')
            ->patchJson("/api/v1/notifications/{$note->id}/read")
            ->assertForbidden();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/v1/notifications/{$note->id}/read")
            ->assertOk()
            ->assertJsonPath('id', $note->id);

        $note->refresh();
        $this->assertNotNull($note->read_at);
    }

    public function test_mark_all_read_zeros_unread_count(): void
    {
        $user = User::factory()->create();
        Notification::factory()->count(3)->create(['user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('unread', 0)
            ->assertJsonPath('updated', 3);
    }

    public function test_preferences_show_returns_default_enabled_matrix(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/notification-preferences')
            ->assertOk()
            ->json();

        $expectedRows = count(NotificationEvents::ALL) * count(NotificationChannels::ALL);
        $this->assertCount($expectedRows, $response['preferences']);
        foreach ($response['preferences'] as $row) {
            $this->assertTrue($row['enabled']);
        }
        $this->assertNotEmpty($response['events']);
        $this->assertNotEmpty($response['channels']);
    }

    public function test_preferences_update_persists_disabled_channels(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/notification-preferences', [
                'preferences' => [
                    [
                        'event_key' => NotificationEvents::APPOINTMENT_CANCELLED,
                        'channel' => NotificationChannels::MAIL,
                        'enabled' => false,
                    ],
                ],
            ])
            ->assertOk();

        $row = NotificationPreference::query()
            ->where('user_id', $user->id)
            ->where('event_key', NotificationEvents::APPOINTMENT_CANCELLED)
            ->where('channel', NotificationChannels::MAIL)
            ->first();
        $this->assertNotNull($row);
        $this->assertFalse((bool) $row->enabled);
    }

    public function test_preferences_update_validates_event_and_channel(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/notification-preferences', [
                'preferences' => [
                    [
                        'event_key' => 'unknown.event',
                        'channel' => 'mail',
                        'enabled' => false,
                    ],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['preferences.0.event_key']);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/notification-preferences', [
                'preferences' => [
                    [
                        'event_key' => NotificationEvents::APPOINTMENT_CONFIRMED,
                        'channel' => 'sms',
                        'enabled' => true,
                    ],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['preferences.0.channel']);
    }

    public function test_booking_creates_in_app_notifications_for_customer_and_barber(): void
    {
        [$barber, $service] = $this->makeBookable();
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertCreated();

        $this->assertDatabaseCount('notifications', 2);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'type' => NotificationEvents::APPOINTMENT_CONFIRMED,
            'read_at' => null,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $barber->id,
            'type' => NotificationEvents::STAFF_BOOKING_CREATED,
            'read_at' => null,
        ]);
        Mail::assertQueued(AppointmentConfirmedMail::class);
    }

    public function test_disabled_in_app_pref_skips_in_app_row(): void
    {
        [$barber, $service] = $this->makeBookable();
        $customer = User::factory()->create();

        // Customer opts out of in-app for confirmations.
        NotificationPreference::query()->create([
            'user_id' => $customer->id,
            'event_key' => NotificationEvents::APPOINTMENT_CONFIRMED,
            'channel' => NotificationChannels::IN_APP,
            'enabled' => false,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertCreated();

        // Only the barber gets a staff in-app notification.
        $this->assertDatabaseCount('notifications', 1);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $barber->id,
            'type' => NotificationEvents::STAFF_BOOKING_CREATED,
        ]);
        Mail::assertQueued(AppointmentConfirmedMail::class);
    }

    public function test_disabled_mail_pref_suppresses_email(): void
    {
        [$barber, $service] = $this->makeBookable();
        $customer = User::factory()->create();

        NotificationPreference::query()->create([
            'user_id' => $customer->id,
            'event_key' => NotificationEvents::APPOINTMENT_CONFIRMED,
            'channel' => NotificationChannels::MAIL,
            'enabled' => false,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertCreated();

        Mail::assertNotQueued(AppointmentConfirmedMail::class);
        // In-app rows still created for both parties.
        $this->assertDatabaseCount('notifications', 2);
    }
}
