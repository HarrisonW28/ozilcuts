<?php

namespace App\Services\Reports;

use App\Models\Appointment;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * Operational pulse: today + this-week snapshot, peak-times heatmap,
 * and lead-time distributions for booking and cancellation.
 *
 * Time semantics:
 *  - "today" buckets are computed from now()->startOfDay() to endOfDay() in
 *    the application's local timezone (CarbonImmutable defaults).
 *  - Peak times are derived from `appointments.starts_at` and grouped into
 *    a 7-row (Sun..Sat) by 24-col (0..23) grid.
 *  - Booking lead time = (starts_at - created_at) for confirmed
 *    appointments whose starts_at falls in [from, to].
 *  - Cancellation lead time = (starts_at - updated_at) for cancelled
 *    appointments whose starts_at falls in [from, to]. We use updated_at
 *    as the cancellation timestamp (status -> cancelled is the most
 *    recent update on these rows in practice).
 */
final class OperationalInsightsService
{
    /** Day labels, indexed by Carbon dayOfWeek (Sun=0..Sat=6). */
    public const WEEKDAY_LABELS = [
        'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
    ];

    /** @var list<array{label: string, max_hours: int|null}> */
    private const BOOKING_LEAD_BUCKETS = [
        ['label' => 'Same day', 'max_hours' => 24],
        ['label' => '1–2 days', 'max_hours' => 24 * 3],
        ['label' => '3–7 days', 'max_hours' => 24 * 8],
        ['label' => '8–14 days', 'max_hours' => 24 * 15],
        ['label' => '15–30 days', 'max_hours' => 24 * 31],
        ['label' => '31+ days', 'max_hours' => null],
    ];

    /** @var list<array{label: string, max_hours: int|null}> */
    private const CANCEL_LEAD_BUCKETS = [
        ['label' => '<2 hours', 'max_hours' => 2],
        ['label' => '2–6 hours', 'max_hours' => 6],
        ['label' => '6–24 hours', 'max_hours' => 24],
        ['label' => '1–3 days', 'max_hours' => 24 * 4],
        ['label' => '4–7 days', 'max_hours' => 24 * 8],
        ['label' => '8+ days', 'max_hours' => null],
    ];

    /**
     * @return array{
     *     today: array{
     *         date: string,
     *         confirmed: int,
     *         cancelled: int,
     *         deposits_collected_cents: int,
     *         deposits_pending_cents: int,
     *     },
     *     week: array{
     *         from: string,
     *         to: string,
     *         confirmed: int,
     *         cancelled: int,
     *         cancel_rate: float,
     *         deposits_collected_cents: int,
     *         deposits_pending_cents: int,
     *     },
     *     range: array{from: string, to: string},
     *     peak_heatmap: list<array{weekday: int, weekday_label: string, hour: int, count: int}>,
     *     booking_lead_time: list<array{label: string, count: int}>,
     *     cancellation_lead_time: list<array{label: string, count: int}>,
     * }
     */
    public function summary(
        CarbonImmutable $now,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): array {
        return [
            'today' => $this->today($now),
            'week' => $this->upcomingWeek($now),
            'range' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'peak_heatmap' => $this->peakHeatmap($from, $to),
            'booking_lead_time' => $this->bookingLeadTime($from, $to),
            'cancellation_lead_time' => $this->cancellationLeadTime($from, $to),
        ];
    }

    /**
     * @return array{
     *     date: string,
     *     confirmed: int,
     *     cancelled: int,
     *     deposits_collected_cents: int,
     *     deposits_pending_cents: int,
     * }
     */
    public function today(CarbonImmutable $now): array
    {
        $start = $now->startOfDay();
        $end = $now->endOfDay();

        $todayQuery = Appointment::query()
            ->whereBetween('starts_at', [$start, $end]);

        $confirmed = (int) (clone $todayQuery)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->count();
        $cancelled = (int) (clone $todayQuery)
            ->where('status', Appointment::STATUS_CANCELLED)
            ->count();

        $depositsCollected = (int) (clone $todayQuery)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('payment_status', Appointment::PAYMENT_PAID)
            ->sum('amount_paid_cents');

        $depositsPending = (int) (clone $todayQuery)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('payment_status', Appointment::PAYMENT_REQUIRES_PAYMENT)
            ->sum('deposit_cents');

        return [
            'date' => $start->toDateString(),
            'confirmed' => $confirmed,
            'cancelled' => $cancelled,
            'deposits_collected_cents' => $depositsCollected,
            'deposits_pending_cents' => $depositsPending,
        ];
    }

    /**
     * Snapshot for "this and the next 6 days" inclusive.
     *
     * @return array{
     *     from: string,
     *     to: string,
     *     confirmed: int,
     *     cancelled: int,
     *     cancel_rate: float,
     *     deposits_collected_cents: int,
     *     deposits_pending_cents: int,
     * }
     */
    public function upcomingWeek(CarbonImmutable $now): array
    {
        $start = $now->startOfDay();
        $end = $now->addDays(6)->endOfDay();

        $weekQuery = Appointment::query()
            ->whereBetween('starts_at', [$start, $end]);

        $confirmed = (int) (clone $weekQuery)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->count();
        $cancelled = (int) (clone $weekQuery)
            ->where('status', Appointment::STATUS_CANCELLED)
            ->count();

        $totalScheduled = $confirmed + $cancelled;
        $cancelRate = $totalScheduled > 0
            ? round($cancelled / $totalScheduled, 4)
            : 0.0;

        $depositsCollected = (int) (clone $weekQuery)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('payment_status', Appointment::PAYMENT_PAID)
            ->sum('amount_paid_cents');
        $depositsPending = (int) (clone $weekQuery)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('payment_status', Appointment::PAYMENT_REQUIRES_PAYMENT)
            ->sum('deposit_cents');

        return [
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
            'confirmed' => $confirmed,
            'cancelled' => $cancelled,
            'cancel_rate' => $cancelRate,
            'deposits_collected_cents' => $depositsCollected,
            'deposits_pending_cents' => $depositsPending,
        ];
    }

    /**
     * 7×24 grid of confirmed appointment counts. Always returns a dense
     * 168-cell grid (Sun..Sat × 0..23) so the UI can render without
     * hole-filling.
     *
     * @return list<array{weekday: int, weekday_label: string, hour: int, count: int}>
     */
    public function peakHeatmap(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $start = $from->startOfDay();
        $end = $to->endOfDay();

        // PHP code path: simple, portable across SQLite/Postgres/MySQL.
        $rows = Appointment::query()
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [$start, $end])
            ->pluck('starts_at');

        $grid = [];
        for ($w = 0; $w < 7; $w++) {
            for ($h = 0; $h < 24; $h++) {
                $grid["$w-$h"] = 0;
            }
        }
        foreach ($rows as $startsAt) {
            $dt = CarbonImmutable::parse((string) $startsAt);
            $key = ((int) $dt->dayOfWeek).'-'.((int) $dt->hour);
            if (isset($grid[$key])) {
                $grid[$key]++;
            }
        }

        $out = [];
        for ($w = 0; $w < 7; $w++) {
            for ($h = 0; $h < 24; $h++) {
                $out[] = [
                    'weekday' => $w,
                    'weekday_label' => self::WEEKDAY_LABELS[$w],
                    'hour' => $h,
                    'count' => $grid["$w-$h"],
                ];
            }
        }

        return $out;
    }

    /**
     * @return list<array{label: string, count: int}>
     */
    public function bookingLeadTime(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = Appointment::query()
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [$from->startOfDay(), $to->endOfDay()])
            ->whereNotNull('created_at')
            ->get(['starts_at', 'created_at']);

        return $this->bucketize(
            $rows,
            fn (Appointment $a) => $this->hoursBetween($a->created_at, $a->starts_at),
            self::BOOKING_LEAD_BUCKETS,
        );
    }

    /**
     * @return list<array{label: string, count: int}>
     */
    public function cancellationLeadTime(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = Appointment::query()
            ->where('status', Appointment::STATUS_CANCELLED)
            ->whereBetween('starts_at', [$from->startOfDay(), $to->endOfDay()])
            ->get(['starts_at', 'updated_at']);

        return $this->bucketize(
            $rows,
            fn (Appointment $a) => $this->hoursBetween($a->updated_at, $a->starts_at),
            self::CANCEL_LEAD_BUCKETS,
        );
    }

    /**
     * @param  Collection<int, Appointment>  $rows
     * @param  callable(Appointment): float|null  $hoursFor
     * @param  list<array{label: string, max_hours: int|null}>  $buckets
     * @return list<array{label: string, count: int}>
     */
    private function bucketize(Collection $rows, callable $hoursFor, array $buckets): array
    {
        $counts = array_fill(0, count($buckets), 0);

        foreach ($rows as $row) {
            $hours = $hoursFor($row);
            if ($hours === null) {
                continue;
            }
            $hours = max(0.0, $hours);
            foreach ($buckets as $idx => $bucket) {
                $max = $bucket['max_hours'];
                if ($max === null || $hours < $max) {
                    $counts[$idx]++;
                    break;
                }
            }
        }

        $out = [];
        foreach ($buckets as $idx => $bucket) {
            $out[] = [
                'label' => $bucket['label'],
                'count' => $counts[$idx],
            ];
        }

        return $out;
    }

    private function hoursBetween($from, $to): ?float
    {
        if ($from === null || $to === null) {
            return null;
        }
        $a = CarbonImmutable::parse((string) $from);
        $b = CarbonImmutable::parse((string) $to);

        return $a->diffInMinutes($b, true) / 60.0;
    }
}
