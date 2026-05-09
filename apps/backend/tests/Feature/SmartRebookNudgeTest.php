<?php

namespace Tests\Feature;

use App\Mail\AppointmentRebookSuggestedMail;
use App\Models\Appointment;
use App\Models\AppointmentRebookNudge;
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

class SmartRebookNudgeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 6, 1, 10, 0, 0));
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

    public function test_command_dispatches_when_customer_is_due(): void
    {
        [$barber, $customer, $service] = $this->trio();
        // Default interval is 28 days when sample size < 2; place the
        // last visit 28 days ago so the suggested date falls today.
        $last = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->subDays(28)->setTime(11, 0),
        );

        $this->artisan('appointments:send-rebook-nudges')->assertExitCode(0);

        Mail::assertQueued(
            AppointmentRebookSuggestedMail::class,
            fn (AppointmentRebookSuggestedMail $m) => $m->hasTo($customer->email)
                && $m->sourceAppointment->id === $last->id,
        );
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'type' => NotificationEvents::APPOINTMENT_REBOOK_SUGGESTED,
        ]);
        $this->assertDatabaseHas('appointment_rebook_nudges', [
            'source_appointment_id' => $last->id,
            'user_id' => $customer->id,
            'state' => AppointmentRebookNudge::STATE_SENT,
        ]);
    }

    public function test_command_is_idempotent_per_source_appointment(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->subDays(30),
        );

        $this->artisan('appointments:send-rebook-nudges')->assertExitCode(0);
        $this->artisan('appointments:send-rebook-nudges')->assertExitCode(0);

        Mail::assertQueuedCount(1);
        $this->assertSame(
            1,
            Notification::query()
                ->where('type', NotificationEvents::APPOINTMENT_REBOOK_SUGGESTED)
                ->count(),
        );
        $this->assertDatabaseCount('appointment_rebook_nudges', 1);
    }

    public function test_command_skips_customers_with_upcoming_booking(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->subDays(30),
        );
        $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDays(5),
        );

        $this->artisan('appointments:send-rebook-nudges')->assertExitCode(0);

        Mail::assertNothingQueued();
        $this->assertDatabaseCount('appointment_rebook_nudges', 0);
    }

    public function test_command_skips_when_not_yet_due(): void
    {
        [$barber, $customer, $service] = $this->trio();
        // Last visit only 5 days ago — suggested date is well in the future.
        $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->subDays(5),
        );

        $this->artisan('appointments:send-rebook-nudges')->assertExitCode(0);

        Mail::assertNothingQueued();
        $this->assertDatabaseCount('appointment_rebook_nudges', 0);
    }

    public function test_snooze_blocks_redispatch_until_expiry(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $last = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->subDays(30),
        );
        AppointmentRebookNudge::query()->create([
            'source_appointment_id' => $last->id,
            'user_id' => $customer->id,
            'state' => AppointmentRebookNudge::STATE_SNOOZED,
            'snooze_until' => CarbonImmutable::now()->addDays(7),
        ]);

        $this->artisan('appointments:send-rebook-nudges')->assertExitCode(0);

        Mail::assertNothingQueued();
        $this->assertSame(
            AppointmentRebookNudge::STATE_SNOOZED,
            AppointmentRebookNudge::query()->first()?->state,
        );
    }

    public function test_snooze_expiry_allows_redispatch(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $last = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->subDays(40),
        );
        AppointmentRebookNudge::query()->create([
            'source_appointment_id' => $last->id,
            'user_id' => $customer->id,
            'state' => AppointmentRebookNudge::STATE_SNOOZED,
            'snooze_until' => CarbonImmutable::now()->subHour(),
        ]);

        $this->artisan('appointments:send-rebook-nudges')->assertExitCode(0);

        Mail::assertQueued(AppointmentRebookSuggestedMail::class);
        $row = AppointmentRebookNudge::query()->first();
        $this->assertSame(AppointmentRebookNudge::STATE_SENT, $row?->state);
        $this->assertNull($row?->snooze_until);
    }

    public function test_mail_optout_suppresses_email_but_keeps_inapp(): void
    {
        [$barber, $customer, $service] = $this->trio();
        NotificationPreference::query()->create([
            'user_id' => $customer->id,
            'event_key' => NotificationEvents::APPOINTMENT_REBOOK_SUGGESTED,
            'channel' => NotificationChannels::MAIL,
            'enabled' => false,
        ]);
        $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->subDays(30),
        );

        $this->artisan('appointments:send-rebook-nudges')->assertExitCode(0);

        Mail::assertNothingQueued();
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'type' => NotificationEvents::APPOINTMENT_REBOOK_SUGGESTED,
        ]);
    }

    public function test_inapp_optout_suppresses_inapp_but_keeps_email(): void
    {
        [$barber, $customer, $service] = $this->trio();
        NotificationPreference::query()->create([
            'user_id' => $customer->id,
            'event_key' => NotificationEvents::APPOINTMENT_REBOOK_SUGGESTED,
            'channel' => NotificationChannels::IN_APP,
            'enabled' => false,
        ]);
        $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->subDays(30),
        );

        $this->artisan('appointments:send-rebook-nudges')->assertExitCode(0);

        Mail::assertQueued(AppointmentRebookSuggestedMail::class);
        $this->assertSame(
            0,
            Notification::query()
                ->where('type', NotificationEvents::APPOINTMENT_REBOOK_SUGGESTED)
                ->count(),
        );
    }
}
