<x-mail::message>
# Your booking was cancelled

This appointment has been cancelled:

@include('emails.appointments._summary', ['appointment' => $appointment])

@if ($appointment->payment_status === 'refunded')
Any deposit you paid has been refunded back to your card. It can take a few business days to appear on your statement.
@endif

You're welcome to book another slot whenever it suits you.

— Ozilcuts
</x-mail::message>
