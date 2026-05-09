<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        $brand = (string) config('brand.name', config('app.name', 'Ozilcuts'));

        return new Envelope(
            subject: "Welcome to {$brand}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.welcome',
            text: 'emails.welcome_text',
            with: [
                'user' => $this->user,
                'bookUrl' => $this->bookUrl(),
                'profileUrl' => $this->profileUrl(),
                'brandName' => (string) config('brand.name', 'Ozilcuts'),
            ],
        );
    }

    private function bookUrl(): string
    {
        $base = rtrim((string) config('brand.website_url', config('services.frontend.url')), '/');

        return $base.'/services';
    }

    private function profileUrl(): string
    {
        $base = rtrim((string) config('brand.website_url', config('services.frontend.url')), '/');

        return $base.'/profile';
    }
}
