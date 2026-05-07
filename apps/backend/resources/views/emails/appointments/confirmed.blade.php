<x-mail::message>
# Your booking is confirmed

Thanks for booking with Ozilcuts. Here are your details:

@include('emails.appointments._summary', ['appointment' => $appointment])

@if ((int) $appointment->deposit_cents > 0 && $appointment->payment_status !== 'paid')
A deposit is required to lock in your slot. Use the button below to complete payment.
@endif

<x-mail::button :url="$confirmationUrl">
View booking
</x-mail::button>

If you need to make changes, you can reschedule or cancel from the **My appointments** page.

— Ozilcuts
</x-mail::message>
