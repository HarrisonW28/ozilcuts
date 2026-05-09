{{ $headline }}
{!! str_repeat('=', max(8, mb_strlen($headline))) !!}

@if ($audience === 'barber')
You have an operational update for one of your appointments.
@else
There is an operational update in the appointment book.
@endif

@if ($actorName)
Action by: {{ $actorName }}
@endif
@if ($previousStart)
Previously: {{ $previousStart }}
@endif

@include('emails.appointments._summary_text', ['appointment' => $appointment])

View appointment:
{{ $appointmentUrl }}

— {{ config('brand.name', 'Ozilcuts') }}
