<?php

namespace Tests\Feature;

use App\Mail\AppointmentRunningLateMail;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use App\Notifications\NotificationEvents;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class AppointmentRunningLateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 5, 10, 14, 0, 0));
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

    public function test_assigned_barber_can_notify_running_late_for_upcoming_booking(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $start = CarbonImmutable::now()->addHours(1);
        $appt = $this->makeAppointment($barber, $customer, $service, $start);

        $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/running-late", [
                'late_by_minutes' => 15,
            ])
            ->assertOk()
            ->assertJsonPath('sent', true);

        Mail::assertQueued(
            AppointmentRunningLateMail::class,
            fn (AppointmentRunningLateMail $m) => $m->hasTo($customer->email)
                && $m->lateByMinutes === 15,
        );
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'type' => NotificationEvents::APPOINTMENT_RUNNING_LATE,
        ]);
        $row = Notification::query()
            ->where('user_id', $customer->id)
            ->where('type', NotificationEvents::APPOINTMENT_RUNNING_LATE)
            ->first();
        $this->assertNotNull($row);
        $data = $row->data;
        $this->assertIsArray($data);
        $this->assertSame(15, $data['late_by_minutes'] ?? null);
        $this->assertSame($appt->id, $data['appointment_id'] ?? null);
    }

    public function test_admin_can_notify_running_late(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $admin = User::factory()->admin()->create();
        $start = CarbonImmutable::now()->addMinutes(20);
        $appt = $this->makeAppointment($barber, $customer, $service, $start);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/running-late", [
                'late_by_minutes' => 10,
            ])
            ->assertOk();

        Mail::assertQueued(AppointmentRunningLateMail::class);
    }

    public function test_can_notify_while_appointment_is_in_progress(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $start = CarbonImmutable::now()->subMinutes(10);
        $appt = $this->makeAppointment($barber, $customer, $service, $start);

        $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/running-late", [
                'late_by_minutes' => 5,
            ])
            ->assertOk();
    }

    public function test_customer_and_other_barbers_are_forbidden(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $otherBarber = User::factory()->barber()->create();
        $start = CarbonImmutable::now()->addHour();
        $appt = $this->makeAppointment($barber, $customer, $service, $start);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/running-late", [
                'late_by_minutes' => 10,
            ])
            ->assertForbidden();

        $this->actingAs($otherBarber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/running-late", [
                'late_by_minutes' => 10,
            ])
            ->assertForbidden();

        Mail::assertNothingQueued();
    }

    public function test_rejects_finished_or_cancelled_appointments(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $admin = User::factory()->admin()->create();
        $past = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->subHours(2),
        );
        $cancelled = $this->makeAppointment(
            $barber,
            $customer,
            $service,
            CarbonImmutable::now()->addDay(),
            Appointment::STATUS_CANCELLED,
        );

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/appointments/{$past->id}/running-late", [
                'late_by_minutes' => 10,
            ])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/appointments/{$cancelled->id}/running-late", [
                'late_by_minutes' => 10,
            ])
            ->assertForbidden();
    }

    public function test_validates_late_by_minutes(): void
    {
        [$barber, $customer, $service] = $this->trio();
        $start = CarbonImmutable::now()->addHour();
        $appt = $this->makeAppointment($barber, $customer, $service, $start);

        $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/running-late", [])
            ->assertUnprocessable();

        $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/running-late", [
                'late_by_minutes' => 0,
            ])
            ->assertUnprocessable();

        $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/running-late", [
                'late_by_minutes' => 200,
            ])
            ->assertUnprocessable();
    }

    public function test_event_appears_in_notification_preferences(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/notification-preferences')
            ->assertOk()
            ->json();

        $events = array_column((array) $response['events'], 'key');
        $this->assertContains(NotificationEvents::APPOINTMENT_RUNNING_LATE, $events);
    }
}
