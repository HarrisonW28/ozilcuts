<?php

namespace App\Mail;

use App\Models\Appointment;
use App\Notifications\NotificationEvents;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentStaffAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Appointment $appointment,
        public string $eventType,
        public string $audience,
        public ?string $previousStart = null,
        public ?string $actorName = null,
    ) {}

    public function envelope(): Envelope
    {
        $brand = (string) config('brand.name', config('app.name', 'Ozilcuts'));

        return new Envelope(
            subject: $this->subjectForEvent($brand),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.appointments.staff_alert',
            text: 'emails.appointments.staff_alert_text',
            with: [
                'appointment' => $this->appointment,
                'eventType' => $this->eventType,
                'headline' => $this->headline(),
                'audience' => $this->audience,
                'previousStart' => $this->previousStart,
                'actorName' => $this->actorName,
                'appointmentUrl' => $this->appointmentUrl(),
            ],
        );
    }

    private function subjectForEvent(string $brand): string
    {
        return match ($this->eventType) {
            NotificationEvents::STAFF_BOOKING_CREATED => "New booking alert — {$brand}",
            NotificationEvents::STAFF_BOOKING_CANCELLED => "Booking cancelled — {$brand}",
            NotificationEvents::STAFF_BOOKING_RESCHEDULED => "Booking rescheduled — {$brand}",
            default => "Appointment alert — {$brand}",
        };
    }

    private function headline(): string
    {
        return match ($this->eventType) {
            NotificationEvents::STAFF_BOOKING_CREATED => 'New booking received',
            NotificationEvents::STAFF_BOOKING_CANCELLED => 'Booking cancelled',
            NotificationEvents::STAFF_BOOKING_RESCHEDULED => 'Booking rescheduled',
            default => 'Appointment update',
        };
    }

    private function appointmentUrl(): string
    {
        $base = rtrim((string) config('services.frontend.url'), '/');

        return $base.'/appointments/'.$this->appointment->id.'/confirmation';
    }
}
