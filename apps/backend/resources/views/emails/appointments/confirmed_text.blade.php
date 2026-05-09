Your booking is confirmed
==========================

Thanks for booking with {{ config('brand.name', 'Ozilcuts') }}. Here are your details:

@include('emails.appointments._summary_text', ['appointment' => $appointment])
@if ((int) $appointment->deposit_cents > 0 && $appointment->payment_status !== 'paid')

A deposit is required to lock in your slot. Complete payment here:
{{ $confirmationUrl }}
@else

View your booking:
{{ $confirmationUrl }}
@endif

If you need to make changes, you can reschedule or cancel from the My appointments page.

— {{ config('brand.name', 'Ozilcuts') }}
