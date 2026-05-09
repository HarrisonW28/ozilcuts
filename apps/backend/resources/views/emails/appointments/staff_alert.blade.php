<x-mail::message>
# {{ $headline }}

@if ($audience === 'barber')
You have an operational update for one of your appointments.
@else
There is an operational update in the appointment book.
@endif

@if ($actorName)
**Action by:** {{ $actorName }}
@endif

@if ($previousStart)
**Previously:** {{ $previousStart }}
@endif

@include('emails.appointments._summary', ['appointment' => $appointment])

<x-mail::button :url="$appointmentUrl">
View appointment
</x-mail::button>

— {{ config('brand.name', 'Ozilcuts') }}
</x-mail::message>
