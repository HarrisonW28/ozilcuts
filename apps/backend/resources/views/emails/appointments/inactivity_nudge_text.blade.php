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
It's been a while
==================

You haven't popped in for longer than your usual {{ $intervalLabel }} rhythm — we'd love to see you again. If it's convenient, {{ $suggestedDate->format('l, M j, Y') }} could work as a fresh starting point.

@if ($service && $barber)
Rebook {{ $service->name }} with {{ $barber->name }}:
@elseif ($service)
Rebook {{ $service->name }}:
@else
Pick a time:
@endif
{{ $bookUrl }}

Prefer fewer reminders? Pause retention nudges from your profile or adjust channels in notification preferences.

— {{ $brand }}
