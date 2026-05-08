<?php

namespace App\Services\Reports;

use App\Models\Appointment;
use App\Models\BarberAvailabilityWindow;
use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Per-barber operational analytics.
 *
 * Definitions:
 *  - "appointments_total"     = confirmed + cancelled with starts_at in range.
 *  - "appointments_confirmed" = status=confirmed in range.
 *  - "appointments_cancelled" = status=cancelled in range.
 *  - "cancellation_rate"      = cancelled / total (0..1, 0 when total=0).
 *  - "booked_cents"           = sum(services.price_cents) for confirmed.
 *  - "collected_cents"        = sum(amount_paid_cents) for paid_at in range
 *                               (independent of booking status).
 *  - "booked_minutes"         = sum(services.duration_minutes) for confirmed.
 *  - "available_minutes"      = sum of weekly availability windows projected
 *                               across the date range (Sun=0..Sat=6).
 *  - "utilization_pct"        = booked_minutes / available_minutes
 *                               (0..1, 0 when available_minutes=0).
 *  - "customers_total"        = distinct customer_user_id (confirmed only).
 *  - "repeat_customers"       = customers with >= 2 confirmed appts in range.
 */
final class BarberAnalyticsService
{
    public const TOP_LIMIT = 5;

    /**
     * @return array{
     *     barber_user_id: int,
     *     barber_name: string,
     *     from: string,
     *     to: string,
     *     appointments_total: int,
     *     appointments_confirmed: int,
     *     appointments_cancelled: int,
     *     cancellation_rate: float,
     *     booked_cents: int,
     *     collected_cents: int,
     *     booked_minutes: int,
     *     available_minutes: int,
     *     utilization_pct: float,
     *     customers_total: int,
     *     repeat_customers: int,
     * }
     */
    public function summary(User $barber, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $confirmedAgg = $this->confirmedQuery($barber, $from, $to)
            ->selectRaw('COUNT(*) as cnt, COALESCE(SUM(services.price_cents), 0) as booked_cents, COALESCE(SUM(services.duration_minutes), 0) as booked_minutes')
            ->first();
        $cancelledCount = (int) $this->barberRangeQuery($barber, $from, $to)
            ->where('appointments.status', Appointment::STATUS_CANCELLED)
            ->count();
        $collectedAgg = $this->collectedQuery($barber, $from, $to)
            ->selectRaw('COALESCE(SUM(amount_paid_cents), 0) as collected_cents')
            ->first();

        $confirmedCount = (int) ($confirmedAgg->cnt ?? 0);
        $bookedCents = (int) ($confirmedAgg->booked_cents ?? 0);
        $bookedMinutes = (int) ($confirmedAgg->booked_minutes ?? 0);
        $collectedCents = (int) ($collectedAgg->collected_cents ?? 0);

        $total = $confirmedCount + $cancelledCount;
        $cancellationRate = $total > 0 ? $cancelledCount / $total : 0.0;

        $availableMinutes = $this->availableMinutes($barber, $from, $to);
        $utilization = $availableMinutes > 0
            ? min(1.0, $bookedMinutes / $availableMinutes)
            : 0.0;

        [$customersTotal, $repeatCustomers] = $this->customerCounts($barber, $from, $to);

        return [
            'barber_user_id' => (int) $barber->id,
            'barber_name' => (string) $barber->name,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'appointments_total' => $total,
            'appointments_confirmed' => $confirmedCount,
            'appointments_cancelled' => $cancelledCount,
            'cancellation_rate' => round($cancellationRate, 4),
            'booked_cents' => $bookedCents,
            'collected_cents' => $collectedCents,
            'booked_minutes' => $bookedMinutes,
            'available_minutes' => $availableMinutes,
            'utilization_pct' => round($utilization, 4),
            'customers_total' => $customersTotal,
            'repeat_customers' => $repeatCustomers,
        ];
    }

    /**
     * @return list<array{
     *     service_id: int,
     *     service_name: string,
     *     count: int,
     *     booked_cents: int,
     * }>
     */
    public function topServices(
        User $barber,
        CarbonImmutable $from,
        CarbonImmutable $to,
        int $limit = self::TOP_LIMIT,
    ): array {
        $rows = $this->confirmedQuery($barber, $from, $to)
            ->groupBy('appointments.service_id', 'services.name')
            ->selectRaw('appointments.service_id as service_id, services.name as service_name, COUNT(*) as cnt, SUM(services.price_cents) as booked_cents')
            ->orderByDesc('cnt')
            ->orderByDesc('booked_cents')
            ->limit($limit)
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'service_id' => (int) $row->service_id,
                'service_name' => (string) $row->service_name,
                'count' => (int) $row->cnt,
                'booked_cents' => (int) $row->booked_cents,
            ];
        }

        return $out;
    }

    /**
     * @return list<array{
     *     customer_user_id: int,
     *     customer_name: string,
     *     visits: int,
     *     booked_cents: int,
     * }>
     */
    public function topCustomers(
        User $barber,
        CarbonImmutable $from,
        CarbonImmutable $to,
        int $limit = self::TOP_LIMIT,
    ): array {
        $rows = $this->confirmedQuery($barber, $from, $to)
            ->join('users as customers', 'customers.id', '=', 'appointments.customer_user_id')
            ->groupBy('appointments.customer_user_id', 'customers.name')
            ->selectRaw('appointments.customer_user_id as customer_user_id, customers.name as customer_name, COUNT(*) as visits, SUM(services.price_cents) as booked_cents')
            ->orderByDesc('visits')
            ->orderByDesc('booked_cents')
            ->limit($limit)
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'customer_user_id' => (int) $row->customer_user_id,
                'customer_name' => (string) $row->customer_name,
                'visits' => (int) $row->visits,
                'booked_cents' => (int) $row->booked_cents,
            ];
        }

        return $out;
    }

    /**
     * @return list<array{
     *     bucket: string,
     *     appointments_count: int,
     *     booked_cents: int,
     *     collected_cents: int,
     * }>
     */
    public function dailySeries(
        User $barber,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): array {
        $bucketStarts = $this->bucketExpression('appointments.starts_at');
        $confirmed = $this->confirmedQuery($barber, $from, $to)
            ->groupByRaw($bucketStarts)
            ->selectRaw("$bucketStarts as bucket, COUNT(*) as cnt, SUM(services.price_cents) as booked_cents")
            ->get()
            ->keyBy('bucket');

        $bucketPaid = $this->bucketExpression('appointments.paid_at');
        $collected = $this->collectedQuery($barber, $from, $to)
            ->groupByRaw($bucketPaid)
            ->selectRaw("$bucketPaid as bucket, SUM(amount_paid_cents) as collected_cents")
            ->get()
            ->keyBy('bucket');

        $out = [];
        $cursor = $from->startOfDay();
        $end = $to->endOfDay();
        while ($cursor->lessThanOrEqualTo($end)) {
            $key = $cursor->toDateString();
            $out[] = [
                'bucket' => $key,
                'appointments_count' => (int) ($confirmed[$key]->cnt ?? 0),
                'booked_cents' => (int) ($confirmed[$key]->booked_cents ?? 0),
                'collected_cents' => (int) ($collected[$key]->collected_cents ?? 0),
            ];
            $cursor = $cursor->addDay();
        }

        return $out;
    }

    /**
     * League-table view across all barbers for the period, ordered by
     * booked_cents desc.
     *
     * @return list<array{
     *     barber_user_id: int,
     *     barber_name: string,
     *     from: string,
     *     to: string,
     *     appointments_total: int,
     *     appointments_confirmed: int,
     *     appointments_cancelled: int,
     *     cancellation_rate: float,
     *     booked_cents: int,
     *     collected_cents: int,
     *     booked_minutes: int,
     *     available_minutes: int,
     *     utilization_pct: float,
     *     customers_total: int,
     *     repeat_customers: int,
     * }>
     */
    public function compare(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $barbers = User::query()
            ->whereHas('role', fn (Builder $q) => $q->where('slug', Role::SLUG_BARBER))
            ->orderBy('name')
            ->get();

        $rows = [];
        foreach ($barbers as $barber) {
            $rows[] = $this->summary($barber, $from, $to);
        }

        usort($rows, fn (array $a, array $b) => $b['booked_cents'] <=> $a['booked_cents']);

        return array_values($rows);
    }

    private function barberRangeQuery(
        User $barber,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): Builder {
        $start = $from->startOfDay();
        $end = $to->endOfDay();

        return Appointment::query()
            ->from('appointments')
            ->where('appointments.barber_user_id', $barber->id)
            ->whereBetween('appointments.starts_at', [$start, $end]);
    }

    private function confirmedQuery(
        User $barber,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): Builder {
        return $this->barberRangeQuery($barber, $from, $to)
            ->join('services', 'services.id', '=', 'appointments.service_id')
            ->where('appointments.status', Appointment::STATUS_CONFIRMED);
    }

    private function collectedQuery(
        User $barber,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): Builder {
        $start = $from->startOfDay();
        $end = $to->endOfDay();

        return Appointment::query()
            ->from('appointments')
            ->where('appointments.barber_user_id', $barber->id)
            ->whereNotNull('appointments.paid_at')
            ->whereBetween('appointments.paid_at', [$start, $end]);
    }

    /**
     * @return array{0: int, 1: int} [customers_total, repeat_customers]
     */
    private function customerCounts(
        User $barber,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): array {
        $rows = $this->barberRangeQuery($barber, $from, $to)
            ->where('appointments.status', Appointment::STATUS_CONFIRMED)
            ->groupBy('appointments.customer_user_id')
            ->selectRaw('appointments.customer_user_id as customer_user_id, COUNT(*) as visits')
            ->get();

        $total = $rows->count();
        $repeat = $rows->filter(fn ($r) => (int) $r->visits >= 2)->count();

        return [$total, $repeat];
    }

    /**
     * Sum the weekly availability windows projected across the date range.
     */
    private function availableMinutes(
        User $barber,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): int {
        $profileId = DB::table('barber_profiles')
            ->where('user_id', $barber->id)
            ->value('id');
        if ($profileId === null) {
            return 0;
        }

        $windows = BarberAvailabilityWindow::query()
            ->where('barber_profile_id', $profileId)
            ->get(['weekday', 'starts_at', 'ends_at']);
        if ($windows->isEmpty()) {
            return 0;
        }

        $minutesPerWeekday = [];
        foreach ($windows as $window) {
            $weekday = (int) $window->weekday;
            $minutes = $this->minutesBetween((string) $window->starts_at, (string) $window->ends_at);
            $minutesPerWeekday[$weekday] = ($minutesPerWeekday[$weekday] ?? 0) + $minutes;
        }

        $cursor = $from->startOfDay();
        $end = $to->endOfDay();
        $total = 0;
        while ($cursor->lessThanOrEqualTo($end)) {
            // CarbonImmutable::dayOfWeek matches PHP date('w'): Sun=0..Sat=6.
            $weekday = $cursor->dayOfWeek;
            $total += $minutesPerWeekday[$weekday] ?? 0;
            $cursor = $cursor->addDay();
        }

        return $total;
    }

    private function minutesBetween(string $start, string $end): int
    {
        return $this->minutesFromTime($end) - $this->minutesFromTime($start);
    }

    private function minutesFromTime(string $time): int
    {
        $parts = explode(':', $time);
        $h = (int) ($parts[0] ?? 0);
        $m = (int) ($parts[1] ?? 0);

        return ($h * 60) + $m;
    }

    private function bucketExpression(string $column): string
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'sqlite') {
            return "strftime('%Y-%m-%d', $column)";
        }
        if ($driver === 'pgsql') {
            return "to_char($column, 'YYYY-MM-DD')";
        }

        return "DATE_FORMAT($column, '%Y-%m-%d')";
    }
}
