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
Time for your next visit?
==========================

It's been {{ $intervalLabel }} since your last booking with {{ $brand }} — based on your usual cadence, you might be due for another visit around {{ $suggestedDate->format('l, M j, Y') }}.

@if ($service && $barber)
Rebook {{ $service->name }} with {{ $barber->name }}:
@elseif ($service)
Rebook {{ $service->name }}:
@else
Grab your next spot:
@endif
{{ $bookUrl }}

Not ready yet? You can always book at your own pace from your account, and these nudges are easy to turn off in your notification preferences.

— {{ $brand }}
