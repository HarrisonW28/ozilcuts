<?php

namespace App\Mail;

use App\Models\Appointment;
use App\Services\Calendar\IcsBuilder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentRescheduledMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Appointment $appointment,
        public string $previousStart,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Booking rescheduled — Ozilcuts',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.appointments.rescheduled',
            text: 'emails.appointments.rescheduled_text',
            with: [
                'appointment' => $this->appointment,
                'previousStart' => $this->previousStart,
                'confirmationUrl' => $this->confirmationUrl(),
            ],
        );
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        // SEQUENCE incremented so calendar clients treat this as an
        // update rather than a new event.
        return [
            Attachment::fromData(
                fn () => IcsBuilder::forAppointment($this->appointment, sequence: '1'),
                IcsBuilder::FILENAME,
            )->withMime(IcsBuilder::MIME),
        ];
    }

    private function confirmationUrl(): string
    {
        $base = rtrim((string) config('services.frontend.url'), '/');

        return $base.'/appointments/'.$this->appointment->id.'/confirmation';
    }
}
