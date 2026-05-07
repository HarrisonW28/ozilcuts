<x-mail::message>
# Your booking was rescheduled

Your appointment has moved.

**Previously:** {{ $previousStart }}

Now:

@include('emails.appointments._summary', ['appointment' => $appointment])

<x-mail::button :url="$confirmationUrl">
View booking
</x-mail::button>

— Ozilcuts
</x-mail::message>
