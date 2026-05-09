{{ $headline }}
{!! str_repeat('=', max(8, mb_strlen($headline))) !!}

Your barber let us know they're running about {{ $lateByMinutes }} {{ $lateByMinutes === 1 ? 'minute' : 'minutes' }} behind for your booking with {{ config('brand.name', 'Ozilcuts') }}:

@include('emails.appointments._summary_text', ['appointment' => $appointment])

Your scheduled time hasn't been automatically changed—this is a courtesy update. You can view or adjust the booking from your account when allowed.

View your booking:
{{ $confirmationUrl }}

— {{ config('brand.name', 'Ozilcuts') }}
