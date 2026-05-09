{{ $headline }}
{!! str_repeat('=', max(8, mb_strlen($headline))) !!}

Just a quick heads-up about your upcoming booking with {{ config('brand.name', 'Ozilcuts') }}:

@include('emails.appointments._summary_text', ['appointment' => $appointment])

View your booking:
{{ $confirmationUrl }}

Need to make changes? You can reschedule or cancel from the My appointments page until your booking starts.

— {{ config('brand.name', 'Ozilcuts') }}
