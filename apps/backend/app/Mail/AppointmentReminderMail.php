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

class AppointmentReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Appointment $appointment,
        /** Human-friendly label of the reminder kind (e.g. "in 24 hours"). */
        public string $headline,
    ) {}

    public function envelope(): Envelope
    {
        $brand = (string) config('brand.name', config('app.name', 'Ozilcuts'));

        return new Envelope(
            subject: "Reminder: your booking — {$brand}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.appointments.reminder',
            text: 'emails.appointments.reminder_text',
            with: [
                'appointment' => $this->appointment,
                'headline' => $this->headline,
                'confirmationUrl' => $this->confirmationUrl(),
            ],
        );
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        // Reminders re-attach the .ics so customers can still drop the
        // booking into their calendar if they missed the original.
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
