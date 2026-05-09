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

class AppointmentConfirmedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Appointment $appointment) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Booking confirmed — Ozilcuts',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.appointments.confirmed',
            text: 'emails.appointments.confirmed_text',
            with: [
                'appointment' => $this->appointment,
                'confirmationUrl' => $this->confirmationUrl(),
            ],
        );
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        return [
            Attachment::fromData(
                fn () => IcsBuilder::forAppointment($this->appointment),
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
