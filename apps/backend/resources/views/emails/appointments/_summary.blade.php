@php
use Carbon\CarbonImmutable;
$service = $appointment->service;
$barber = $appointment->barber;
$start = $appointment->starts_at ? CarbonImmutable::parse((string) $appointment->starts_at) : null;
@endphp

@if ($service)
**Service:** {{ $service->name }} ({{ $service->duration_minutes }} min)
@endif

@if ($barber)
**Barber:** {{ $barber->name }}
@endif

@if ($start)
**When:** {{ $start->format('l, M j, Y \a\t g:i A T') }}
@endif

@if ((int) $appointment->deposit_cents > 0)
**Deposit:** ${{ number_format($appointment->deposit_cents / 100, 2) }} ({{ str_replace('_', ' ', (string) $appointment->payment_status) }})
@endif
