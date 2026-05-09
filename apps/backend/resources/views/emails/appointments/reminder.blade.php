<x-mail::message>
# {{ $headline }}

Just a quick heads-up about your upcoming booking with {{ config('brand.name', 'Ozilcuts') }}:

@include('emails.appointments._summary', ['appointment' => $appointment])

<x-mail::button :url="$confirmationUrl">
View booking
</x-mail::button>

Need to make changes? You can reschedule or cancel from the **My appointments** page until your booking starts.

— {{ config('brand.name', 'Ozilcuts') }}
</x-mail::message>
