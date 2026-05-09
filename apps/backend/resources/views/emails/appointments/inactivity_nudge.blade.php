@php
use Carbon\CarbonImmutable;
$brand = config('brand.name', 'Ozilcuts');
$service = $appointment->service;
$barber = $appointment->barber;
$suggestedDate = CarbonImmutable::parse($suggestion['suggested_date']);
$intervalDays = (int) $suggestion['interval_days'];
$intervalLabel = $intervalDays === 7
    ? 'about a week'
    : ($intervalDays % 7 === 0
        ? 'about ' . ((int) ($intervalDays / 7)) . ' weeks'
        : 'about ' . $intervalDays . ' days');
@endphp

<x-mail::message>
# It&rsquo;s been a while

You haven&rsquo;t popped in for longer than your usual **{{ $intervalLabel }}** rhythm — we&rsquo;d love to see you again. If it&rsquo;s convenient, **{{ $suggestedDate->format('l, M j, Y') }}** could work as a fresh starting point.

@if ($service && $barber)
Tap below to grab **{{ $service->name }}** with **{{ $barber->name }}**:
@elseif ($service)
Tap below to grab **{{ $service->name }}**:
@else
Tap below to pick a time:
@endif

<x-mail::button :url="$bookUrl">
Book again
</x-mail::button>

Prefer fewer reminders? You can pause retention nudges from your profile or adjust channels in notification preferences.

— {{ $brand }}
</x-mail::message>
