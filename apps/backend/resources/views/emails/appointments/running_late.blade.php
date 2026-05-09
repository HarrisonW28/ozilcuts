<x-mail::message>
# {{ $headline }}

Your barber asked us to let you know they&rsquo;re running about **{{ $lateByMinutes }} {{ $lateByMinutes === 1 ? 'minute' : 'minutes' }}** behind for your booking with {{ config('brand.name', 'Ozilcuts') }}:

@include('emails.appointments._summary', ['appointment' => $appointment])

Your appointment time on the calendar hasn&rsquo;t changed yet—this is a courtesy heads-up. If you need to adjust, you can reschedule from **My appointments** when the slot still allows it.

<x-mail::button :url="$confirmationUrl">
View booking
</x-mail::button>

— {{ config('brand.name', 'Ozilcuts') }}
</x-mail::message>
