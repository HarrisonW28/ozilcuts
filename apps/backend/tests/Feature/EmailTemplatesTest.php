<?php

namespace Tests\Feature;

use App\Mail\AppointmentCancelledMail;
use App\Mail\AppointmentConfirmedMail;
use App\Mail\AppointmentRescheduledMail;
use App\Mail\WelcomeMail;
use App\Models\Appointment;
use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\Service;
use App\Models\User;
use App\Services\Calendar\IcsBuilder;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailTemplatesTest extends TestCase
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

    public function test_email_signup_queues_welcome_mail(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Sam Welcome',
            'email' => 'sam.welcome@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'accept_terms' => true,
            'accept_privacy' => true,
        ])->assertCreated();

        Mail::assertQueued(
            WelcomeMail::class,
            fn (WelcomeMail $mail) => $mail->hasTo('sam.welcome@example.com'),
        );
    }

    public function test_welcome_mail_renders_with_brand_name_and_links(): void
    {
        config()->set('brand.name', 'Ozilcuts');
        config()->set('brand.website_url', 'https://ozilcuts.test');
        $user = User::factory()->create([
            'name' => 'Pat Customer',
            'email' => 'pat@example.com',
        ]);

        $rendered = (new WelcomeMail($user))->render();
        $this->assertStringContainsString('Welcome to Ozilcuts', $rendered);
        $this->assertStringContainsString('Pat Customer', $rendered);
        $this->assertStringContainsString('https://ozilcuts.test/services', $rendered);
        $this->assertStringContainsString('https://ozilcuts.test/profile', $rendered);
    }

    public function test_appointment_confirmation_mail_includes_ics_attachment(): void
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
        ])->fresh(['service', 'barber', 'customer']);
        $this->assertNotNull($appt);

        $mail = new AppointmentConfirmedMail($appt);
        $attachments = $mail->attachments();
        $this->assertCount(1, $attachments);
        $this->assertSame(IcsBuilder::FILENAME, $attachments[0]->as);
        $this->assertSame(IcsBuilder::MIME, $attachments[0]->mime);

        $ics = IcsBuilder::forAppointment($appt);
        $this->assertStringContainsString('STATUS:CONFIRMED', $ics);
        $this->assertStringContainsString('SEQUENCE:0', $ics);
    }

    public function test_reschedule_mail_includes_ics_attachment_with_sequence_one(): void
    {
        [$barber, $service] = $this->makeBookable();
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 10:00:00',
            'ends_at' => '2026-05-11 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ])->fresh(['service', 'barber', 'customer']);
        $this->assertNotNull($appt);

        $mail = new AppointmentRescheduledMail($appt, 'Mon, May 11, 2026 at 9:00 AM');
        $attachments = $mail->attachments();
        $this->assertCount(1, $attachments);
        $this->assertSame(IcsBuilder::FILENAME, $attachments[0]->as);
        $this->assertSame(IcsBuilder::MIME, $attachments[0]->mime);

        $ics = IcsBuilder::forAppointment($appt, sequence: '1');
        $this->assertStringContainsString('SEQUENCE:1', $ics);
        $this->assertStringContainsString('METHOD:REQUEST', $ics);
    }

    public function test_ics_payload_contains_event_metadata(): void
    {
        [$barber, $service] = $this->makeBookable();
        $customer = User::factory()->create([
            'name' => 'Jamie',
            'email' => 'jamie@example.com',
        ]);
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 11:00:00',
            'ends_at' => '2026-05-11 11:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ])->fresh(['service', 'barber', 'customer']);
        $this->assertNotNull($appt);

        $ics = IcsBuilder::forAppointment($appt);
        $this->assertStringContainsString('BEGIN:VCALENDAR', $ics);
        $this->assertStringContainsString('END:VCALENDAR', $ics);
        $this->assertStringContainsString('BEGIN:VEVENT', $ics);
        $this->assertStringContainsString('END:VEVENT', $ics);
        $this->assertStringContainsString('SUMMARY:', $ics);
        $this->assertStringContainsString('DTSTART:', $ics);
        $this->assertStringContainsString('DTEND:', $ics);
        $this->assertStringContainsString('STATUS:CONFIRMED', $ics);
        $this->assertStringContainsString('jamie@example.com', $ics);
        // CRLF line endings per RFC 5545.
        $this->assertStringContainsString("\r\n", $ics);
    }

    public function test_ics_payload_marks_cancelled_appointments(): void
    {
        [$barber, $service] = $this->makeBookable();
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 12:00:00',
            'ends_at' => '2026-05-11 12:30:00',
            'status' => Appointment::STATUS_CANCELLED,
        ])->fresh(['service', 'barber', 'customer']);
        $this->assertNotNull($appt);

        $ics = IcsBuilder::forAppointment($appt);
        $this->assertStringContainsString('STATUS:CANCELLED', $ics);
    }

    public function test_appointment_mails_render_plain_text_alternatives(): void
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
        ])->fresh(['service', 'barber', 'customer']);
        $this->assertNotNull($appt);

        // The text view renders plain content (no <html>/<body> tags) and
        // contains the same data points as the markdown view.
        $textConfirmed = view('emails.appointments.confirmed_text', [
            'appointment' => $appt,
            'confirmationUrl' => 'https://ozilcuts.test/appointments/'.$appt->id.'/confirmation',
        ])->render();
        $this->assertStringNotContainsString('<html', $textConfirmed);
        $this->assertStringContainsString('Your booking is confirmed', $textConfirmed);
        $this->assertStringContainsString($service->name, $textConfirmed);

        $textCancelled = view('emails.appointments.cancelled_text', [
            'appointment' => $appt,
        ])->render();
        $this->assertStringContainsString('Your booking was cancelled', $textCancelled);

        $textRescheduled = view('emails.appointments.rescheduled_text', [
            'appointment' => $appt,
            'previousStart' => 'Mon, May 11, 2026 at 9:00 AM',
            'confirmationUrl' => 'https://ozilcuts.test/appointments/'.$appt->id.'/confirmation',
        ])->render();
        $this->assertStringContainsString('Your booking was rescheduled', $textRescheduled);
        $this->assertStringContainsString('Mon, May 11, 2026', $textRescheduled);
    }

    public function test_existing_email_subjects_reflect_brand_name(): void
    {
        config()->set('brand.name', 'Ozilcuts');

        [$barber, $service] = $this->makeBookable();
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ])->fresh(['service', 'barber', 'customer']);
        $this->assertNotNull($appt);

        $mail = new AppointmentConfirmedMail($appt);
        $this->assertStringContainsString('Ozilcuts', $mail->envelope()->subject);

        $cancel = new AppointmentCancelledMail($appt);
        $this->assertStringContainsString('Ozilcuts', $cancel->envelope()->subject);
    }
}
