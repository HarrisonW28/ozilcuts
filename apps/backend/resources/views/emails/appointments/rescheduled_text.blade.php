Your booking was rescheduled
=============================

Your appointment has moved.

Previously: {{ $previousStart }}

Now:

@include('emails.appointments._summary_text', ['appointment' => $appointment])

View your booking:
{{ $confirmationUrl }}

— {{ config('brand.name', 'Ozilcuts') }}
