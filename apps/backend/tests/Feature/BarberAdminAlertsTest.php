<?php

namespace Tests\Feature;

use App\Mail\AppointmentConfirmedMail;
use App\Mail\AppointmentStaffAlertMail;
use App\Models\Appointment;
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

class BarberAdminAlertsTest extends TestCase
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

    private function makeAppointment(User $barber, User $customer, Service $service): Appointment
    {
        return Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);
    }

    public function test_new_booking_alerts_assigned_barber_and_all_admins(): void
    {
        [$barber, $service] = $this->makeBookable();
        $adminA = User::factory()->admin()->create();
        $adminB = User::factory()->admin()->create();
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertCreated();

        Mail::assertQueued(
            AppointmentConfirmedMail::class,
            fn (AppointmentConfirmedMail $mail) => $mail->hasTo($customer->email) && ! $mail->hasCc($barber->email),
        );
        foreach ([$barber, $adminA, $adminB] as $staff) {
            Mail::assertQueued(
                AppointmentStaffAlertMail::class,
                fn (AppointmentStaffAlertMail $mail) => $mail->hasTo($staff->email),
            );
            $this->assertDatabaseHas('notifications', [
                'user_id' => $staff->id,
                'type' => NotificationEvents::STAFF_BOOKING_CREATED,
            ]);
        }
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'type' => NotificationEvents::APPOINTMENT_CONFIRMED,
        ]);
    }

    public function test_cancel_alerts_staff_with_cancel_event(): void
    {
        [$barber, $service] = $this->makeBookable();
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();
        $appt = $this->makeAppointment($barber, $customer, $service);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/cancel")
            ->assertOk();

        foreach ([$barber, $admin] as $staff) {
            Mail::assertQueued(
                AppointmentStaffAlertMail::class,
                fn (AppointmentStaffAlertMail $mail) => $mail->hasTo($staff->email)
                    && $mail->eventType === NotificationEvents::STAFF_BOOKING_CANCELLED,
            );
            $this->assertDatabaseHas('notifications', [
                'user_id' => $staff->id,
                'type' => NotificationEvents::STAFF_BOOKING_CANCELLED,
            ]);
        }
    }

    public function test_reschedule_alerts_staff_with_previous_start(): void
    {
        [$barber, $service] = $this->makeBookable();
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();
        $appt = $this->makeAppointment($barber, $customer, $service);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/reschedule", [
                'starts_at' => '2026-05-11T10:00:00',
            ])
            ->assertOk();

        foreach ([$barber, $admin] as $staff) {
            Mail::assertQueued(
                AppointmentStaffAlertMail::class,
                fn (AppointmentStaffAlertMail $mail) => $mail->hasTo($staff->email)
                    && $mail->eventType === NotificationEvents::STAFF_BOOKING_RESCHEDULED
                    && str_contains((string) $mail->previousStart, '2026'),
            );
            $this->assertDatabaseHas('notifications', [
                'user_id' => $staff->id,
                'type' => NotificationEvents::STAFF_BOOKING_RESCHEDULED,
            ]);
        }
    }

    public function test_staff_mail_optout_suppresses_staff_email_but_keeps_inapp_alert(): void
    {
        [$barber, $service] = $this->makeBookable();
        $customer = User::factory()->create();
        NotificationPreference::query()->create([
            'user_id' => $barber->id,
            'event_key' => NotificationEvents::STAFF_BOOKING_CREATED,
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

        Mail::assertNotQueued(
            AppointmentStaffAlertMail::class,
            fn (AppointmentStaffAlertMail $mail) => $mail->hasTo($barber->email),
        );
        $this->assertDatabaseHas('notifications', [
            'user_id' => $barber->id,
            'type' => NotificationEvents::STAFF_BOOKING_CREATED,
        ]);
    }

    public function test_notifications_operational_filter_returns_only_staff_alerts(): void
    {
        $barber = User::factory()->barber()->create();
        Notification::factory()->create([
            'user_id' => $barber->id,
            'type' => NotificationEvents::APPOINTMENT_CONFIRMED,
        ]);
        Notification::factory()->create([
            'user_id' => $barber->id,
            'type' => NotificationEvents::STAFF_BOOKING_CREATED,
        ]);
        Notification::factory()->create([
            'user_id' => $barber->id,
            'type' => NotificationEvents::STAFF_BOOKING_CANCELLED,
        ]);

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/notifications?operational=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.type', NotificationEvents::STAFF_BOOKING_CANCELLED)
            ->assertJsonPath('data.1.type', NotificationEvents::STAFF_BOOKING_CREATED);
    }

    public function test_staff_alert_events_appear_in_preferences_matrix(): void
    {
        $admin = User::factory()->admin()->create();
        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/notification-preferences')
            ->assertOk()
            ->json();

        $events = array_column((array) $response['events'], 'key');
        $this->assertContains(NotificationEvents::STAFF_BOOKING_CREATED, $events);
        $this->assertContains(NotificationEvents::STAFF_BOOKING_CANCELLED, $events);
        $this->assertContains(NotificationEvents::STAFF_BOOKING_RESCHEDULED, $events);
    }
}
