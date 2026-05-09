<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentRebookSuggestedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  array{
     *     interval_days: int,
     *     sample_size: int,
     *     suggested_date: string,
     *     last_appointment_at: string|null,
     *     barber_user_id: int,
     *     service_id: int,
     * }  $suggestion
     */
    public function __construct(
        public Appointment $sourceAppointment,
        public array $suggestion,
    ) {}

    public function envelope(): Envelope
    {
        $brand = (string) config('brand.name', config('app.name', 'Ozilcuts'));

        return new Envelope(
            subject: "Time for your next visit — {$brand}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.appointments.rebook_suggested',
            text: 'emails.appointments.rebook_suggested_text',
            with: [
                'appointment' => $this->sourceAppointment,
                'suggestion' => $this->suggestion,
                'bookUrl' => $this->bookUrl(),
            ],
        );
    }

    private function bookUrl(): string
    {
        $base = rtrim((string) config('services.frontend.url'), '/');
        $params = http_build_query([
            'service_id' => $this->suggestion['service_id'],
            'barber_user_id' => $this->suggestion['barber_user_id'],
            'date' => $this->suggestion['suggested_date'],
        ]);

        return $base.'/book?'.$params;
    }
}
