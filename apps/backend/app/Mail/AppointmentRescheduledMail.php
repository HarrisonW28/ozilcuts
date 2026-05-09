<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
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

    private function confirmationUrl(): string
    {
        $base = rtrim((string) config('services.frontend.url'), '/');

        return $base.'/appointments/'.$this->appointment->id.'/confirmation';
    }
}
