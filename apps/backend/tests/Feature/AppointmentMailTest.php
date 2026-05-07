<?php

namespace Tests\Feature;

use App\Mail\AppointmentCancelledMail;
use App\Mail\AppointmentConfirmedMail;
use App\Mail\AppointmentRescheduledMail;
use App\Models\Appointment;
use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AppointmentMailTest extends TestCase
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

    public function test_booking_queues_confirmation_email_to_customer_and_barber(): void
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

        Mail::assertQueued(
            AppointmentConfirmedMail::class,
            fn ($mail) => $mail->hasTo($customer->email) && $mail->hasCc($barber->email),
        );
    }

    public function test_cancel_queues_cancellation_email(): void
    {
        [$barber, $service] = $this->makeBookable();
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/cancel")
            ->assertOk();

        Mail::assertQueued(
            AppointmentCancelledMail::class,
            fn ($mail) => $mail->hasTo($customer->email) && $mail->hasCc($barber->email),
        );
    }

    public function test_reschedule_queues_reschedule_email_with_previous_start(): void
    {
        [$barber, $service] = $this->makeBookable();
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/reschedule", [
                'starts_at' => '2026-05-11T10:00:00',
            ])
            ->assertOk();

        Mail::assertQueued(
            AppointmentRescheduledMail::class,
            function (AppointmentRescheduledMail $mail) use ($customer, $barber) {
                if (! $mail->hasTo($customer->email)) {
                    return false;
                }
                if (! $mail->hasCc($barber->email)) {
                    return false;
                }

                return str_contains($mail->previousStart, '2026');
            },
        );
    }

    public function test_confirmation_mail_renders_markdown_view(): void
    {
        [$barber, $service] = $this->makeBookable();
        $customer = User::factory()->create();
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
        $appt->load(['service', 'barber', 'customer']);

        $rendered = (new AppointmentConfirmedMail($appt))->render();
        $this->assertStringContainsString('Your booking is confirmed', $rendered);
        $this->assertStringContainsString($service->name, $rendered);
        $this->assertStringContainsString($barber->name, $rendered);
        $this->assertStringContainsString('Deposit', $rendered);
    }
}
