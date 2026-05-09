<?php

namespace Tests\Feature;

use App\Mail\AppointmentReminderMail;
use App\Models\Appointment;
use App\Models\AppointmentReminder;
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

class AppointmentReminderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 5, 10, 9, 0, 0));
        Mail::fake();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{User, User, Service}
     */
    private function trio(): array
    {
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'is_active' => true,
        ]);

        return [$barber, $customer, $service];
    }

    private function makeAppointment(
        User $barber,
        User $customer,
        Service $service,
        CarbonImmutable $startsAt,
        string $status = Appointment::STATUS_CONFIRMED,
    ): Appointment {
        return Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->addMinutes(30),
            'status' => $status,
        ]);
    }

    public function test_command_sends_day_before_reminder_within_tolerance(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $start = CarbonImmutable::now()->addDay()->addMinutes(5); // ~24h05m away
        $appt = $this->makeAppointment($barber, $customer, $service, $start);

        $this->artisan('appointments:send-reminders')->assertExitCode(0);

        Mail::assertQueued(
            AppointmentReminderMail::class,
            fn (AppointmentReminderMail $m) => $m->hasTo($customer->email),
        );
        $this->assertDatabaseHas('appointment_reminders', [
            'appointment_id' => $appt->id,
            'kind' => AppointmentReminder::KIND_DAY_BEFORE,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'type' => NotificationEvents::APPOINTMENT_REMINDER,
        ]);
    }

    public function test_command_sends_hour_before_reminder_within_tolerance(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $start = CarbonImmutable::now()->addMinutes(115); // ~1h55m away
        $appt = $this->makeAppointment($barber, $customer, $service, $start);

        $this->artisan('appointments:send-reminders')->assertExitCode(0);

        Mail::assertQueued(AppointmentReminderMail::class);
        $this->assertDatabaseHas('appointment_reminders', [
            'appointment_id' => $appt->id,
            'kind' => AppointmentReminder::KIND_HOUR_BEFORE,
        ]);
    }

    public function test_command_does_not_send_outside_tolerance(): void
    {
        [$barber, $customer, $service] = $this->trio();
        // Far in the future (3 days) — outside both windows.
        $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDays(3),
        );

        $this->artisan('appointments:send-reminders')->assertExitCode(0);

        Mail::assertNothingQueued();
        $this->assertDatabaseCount('appointment_reminders', 0);
    }

    public function test_command_skips_cancelled_appointments(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDay(),
            status: Appointment::STATUS_CANCELLED,
        );

        $this->artisan('appointments:send-reminders')->assertExitCode(0);

        Mail::assertNothingQueued();
        $this->assertDatabaseCount('appointment_reminders', 0);
    }

    public function test_command_skips_past_appointments(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->subHour(),
        );

        $this->artisan('appointments:send-reminders')->assertExitCode(0);

        Mail::assertNothingQueued();
    }

    public function test_command_is_idempotent_for_scheduled_kinds(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $appt = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDay(),
        );

        $this->artisan('appointments:send-reminders')->assertExitCode(0);
        $this->artisan('appointments:send-reminders')->assertExitCode(0);

        // Second run should be a no-op.
        Mail::assertQueuedCount(1);
        $this->assertSame(1, AppointmentReminder::query()
            ->where('appointment_id', $appt->id)
            ->where('kind', AppointmentReminder::KIND_DAY_BEFORE)
            ->count());
    }

    public function test_customer_mail_optout_suppresses_email_but_keeps_inapp(): void
    {
        [$barber, $customer, $service] = $this->trio();
        NotificationPreference::query()->create([
            'user_id' => $customer->id,
            'event_key' => NotificationEvents::APPOINTMENT_REMINDER,
            'channel' => NotificationChannels::MAIL,
            'enabled' => false,
        ]);
        $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDay(),
        );

        $this->artisan('appointments:send-reminders')->assertExitCode(0);

        Mail::assertNothingQueued();
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'type' => NotificationEvents::APPOINTMENT_REMINDER,
        ]);
    }

    public function test_customer_inapp_optout_suppresses_inapp_but_keeps_email(): void
    {
        [$barber, $customer, $service] = $this->trio();
        NotificationPreference::query()->create([
            'user_id' => $customer->id,
            'event_key' => NotificationEvents::APPOINTMENT_REMINDER,
            'channel' => NotificationChannels::IN_APP,
            'enabled' => false,
        ]);
        $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDay(),
        );

        $this->artisan('appointments:send-reminders')->assertExitCode(0);

        Mail::assertQueued(AppointmentReminderMail::class);
        $this->assertSame(0, Notification::query()
            ->where('type', NotificationEvents::APPOINTMENT_REMINDER)
            ->count());
    }

    public function test_admin_can_send_manual_reminder(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $admin = User::factory()->admin()->create();
        $appt = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDays(5),
        );

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/reminder")
            ->assertOk()
            ->assertJsonPath('sent', true);

        Mail::assertQueued(AppointmentReminderMail::class);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'type' => NotificationEvents::APPOINTMENT_REMINDER,
        ]);
        // Manual reminders are NOT recorded so admins can re-send.
        $this->assertDatabaseCount('appointment_reminders', 0);
    }

    public function test_assigned_barber_can_send_manual_reminder(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $appt = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDays(2),
        );

        $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/reminder")
            ->assertOk();

        Mail::assertQueued(AppointmentReminderMail::class);
    }

    public function test_other_users_cannot_send_manual_reminder(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $otherBarber = User::factory()->barber()->create();
        $appt = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDay(),
        );

        // Customer (the appointment owner) is not allowed.
        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/reminder")
            ->assertForbidden();

        // Another barber not assigned to the appointment is not allowed.
        $this->actingAs($otherBarber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/reminder")
            ->assertForbidden();

        Mail::assertNothingQueued();
    }

    public function test_manual_reminder_rejected_for_cancelled_or_past(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $admin = User::factory()->admin()->create();
        $cancelled = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDay(),
            status: Appointment::STATUS_CANCELLED,
        );
        $past = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->subHour(),
        );

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/appointments/{$cancelled->id}/reminder")
            ->assertForbidden();
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/appointments/{$past->id}/reminder")
            ->assertForbidden();

        Mail::assertNothingQueued();
    }

    public function test_admin_manual_reminder_can_be_sent_repeatedly(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $admin = User::factory()->admin()->create();
        $appt = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDays(2),
        );

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/reminder")
            ->assertOk();
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/reminder")
            ->assertOk();

        Mail::assertQueuedCount(2);
    }

    public function test_reminder_event_appears_in_preferences_matrix(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/notification-preferences')
            ->assertOk()
            ->json();

        $events = array_column((array) $response['events'], 'key');
        $this->assertContains(NotificationEvents::APPOINTMENT_REMINDER, $events);
    }
}
