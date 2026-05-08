<?php

namespace App\Services\Reports;

use App\Models\Appointment;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Aggregates revenue from appointment + payment data.
 *
 * Definitions:
 *  - "booked" cents: sum of services.price_cents for confirmed appointments
 *    whose starts_at falls inside the period (gross billable revenue).
 *  - "collected" cents: sum of appointments.amount_paid_cents for appointments
 *    whose paid_at timestamp falls inside the period (cash actually received
 *    via Stripe deposits).
 *  - "refunded" cents: sum of appointments.amount_paid_cents for appointments
 *    whose refunded_at timestamp falls inside the period (deposits returned).
 *  - "net_collected" = collected - refunded.
 *
 * The two views deliberately use different timestamps because they answer
 * different questions: "how much did we book for the period?" vs. "how much
 * cash hit our account in the period?".
 */
final class RevenueReportService
{
    public const GRANULARITY_DAY = 'day';

    public const GRANULARITY_MONTH = 'month';

    /**
     * @return array{
     *     from: string,
     *     to: string,
     *     booked_cents: int,
     *     collected_cents: int,
     *     refunded_cents: int,
     *     net_collected_cents: int,
     *     booked_appointments: int,
     *     paid_appointments: int,
     * }
     */
    public function summary(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $bookedAgg = $this->bookedQuery($from, $to)
            ->selectRaw('COALESCE(SUM(services.price_cents), 0) as total, COUNT(*) as appointments')
            ->first();
        $collectedAgg = $this->collectedQuery($from, $to)
            ->selectRaw('COALESCE(SUM(amount_paid_cents), 0) as total, COUNT(*) as appointments')
            ->first();
        $refundedAgg = $this->refundedQuery($from, $to)
            ->selectRaw('COALESCE(SUM(amount_paid_cents), 0) as total')
            ->first();

        $bookedCents = (int) ($bookedAgg->total ?? 0);
        $collectedCents = (int) ($collectedAgg->total ?? 0);
        $refundedCents = (int) ($refundedAgg->total ?? 0);

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'booked_cents' => $bookedCents,
            'collected_cents' => $collectedCents,
            'refunded_cents' => $refundedCents,
            'net_collected_cents' => $collectedCents - $refundedCents,
            'booked_appointments' => (int) ($bookedAgg->appointments ?? 0),
            'paid_appointments' => (int) ($collectedAgg->appointments ?? 0),
        ];
    }

    /**
     * @return list<array{
     *     barber_user_id: int,
     *     barber_name: string,
     *     booked_cents: int,
     *     collected_cents: int,
     *     booked_appointments: int,
     * }>
     */
    public function byBarber(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $booked = $this->bookedQuery($from, $to)
            ->join('users as barbers', 'barbers.id', '=', 'appointments.barber_user_id')
            ->groupBy('appointments.barber_user_id', 'barbers.name')
            ->selectRaw('appointments.barber_user_id as barber_user_id, barbers.name as barber_name, SUM(services.price_cents) as booked_cents, COUNT(*) as booked_appointments')
            ->get()
            ->keyBy('barber_user_id');

        $collected = $this->collectedQuery($from, $to)
            ->join('users as barbers', 'barbers.id', '=', 'appointments.barber_user_id')
            ->groupBy('appointments.barber_user_id', 'barbers.name')
            ->selectRaw('appointments.barber_user_id as barber_user_id, barbers.name as barber_name, SUM(amount_paid_cents) as collected_cents')
            ->get()
            ->keyBy('barber_user_id');

        $rows = [];
        foreach ($booked as $key => $row) {
            $rows[$key] = [
                'barber_user_id' => (int) $row->barber_user_id,
                'barber_name' => (string) $row->barber_name,
                'booked_cents' => (int) $row->booked_cents,
                'collected_cents' => (int) ($collected[$key]->collected_cents ?? 0),
                'booked_appointments' => (int) $row->booked_appointments,
            ];
        }
        foreach ($collected as $key => $row) {
            if (isset($rows[$key])) {
                continue;
            }
            $rows[$key] = [
                'barber_user_id' => (int) $row->barber_user_id,
                'barber_name' => (string) $row->barber_name,
                'booked_cents' => 0,
                'collected_cents' => (int) $row->collected_cents,
                'booked_appointments' => 0,
            ];
        }
        usort($rows, fn (array $a, array $b) => $b['booked_cents'] <=> $a['booked_cents']);

        return array_values($rows);
    }

    /**
     * @return list<array{
     *     service_id: int,
     *     service_name: string,
     *     booked_cents: int,
     *     collected_cents: int,
     *     booked_appointments: int,
     * }>
     */
    public function byService(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $booked = $this->bookedQuery($from, $to)
            ->groupBy('appointments.service_id', 'services.name')
            ->selectRaw('appointments.service_id as service_id, services.name as service_name, SUM(services.price_cents) as booked_cents, COUNT(*) as booked_appointments')
            ->get()
            ->keyBy('service_id');

        $collected = $this->collectedQuery($from, $to)
            ->join('services', 'services.id', '=', 'appointments.service_id')
            ->groupBy('appointments.service_id', 'services.name')
            ->selectRaw('appointments.service_id as service_id, services.name as service_name, SUM(amount_paid_cents) as collected_cents')
            ->get()
            ->keyBy('service_id');

        $rows = [];
        foreach ($booked as $key => $row) {
            $rows[$key] = [
                'service_id' => (int) $row->service_id,
                'service_name' => (string) $row->service_name,
                'booked_cents' => (int) $row->booked_cents,
                'collected_cents' => (int) ($collected[$key]->collected_cents ?? 0),
                'booked_appointments' => (int) $row->booked_appointments,
            ];
        }
        foreach ($collected as $key => $row) {
            if (isset($rows[$key])) {
                continue;
            }
            $rows[$key] = [
                'service_id' => (int) $row->service_id,
                'service_name' => (string) $row->service_name,
                'booked_cents' => 0,
                'collected_cents' => (int) $row->collected_cents,
                'booked_appointments' => 0,
            ];
        }
        usort($rows, fn (array $a, array $b) => $b['booked_cents'] <=> $a['booked_cents']);

        return array_values($rows);
    }

    /**
     * @return list<array{
     *     bucket: string,
     *     booked_cents: int,
     *     collected_cents: int,
     *     booked_appointments: int,
     * }>
     */
    public function series(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $granularity,
    ): array {
        if (! in_array($granularity, [self::GRANULARITY_DAY, self::GRANULARITY_MONTH], true)) {
            $granularity = self::GRANULARITY_DAY;
        }

        $bookedRaw = $this->bookedSeriesExpression($granularity);
        $booked = $this->bookedQuery($from, $to)
            ->groupByRaw($bookedRaw)
            ->selectRaw("$bookedRaw as bucket, SUM(services.price_cents) as booked_cents, COUNT(*) as booked_appointments")
            ->get()
            ->keyBy('bucket');

        $paidRaw = $this->paidSeriesExpression($granularity);
        $collected = $this->collectedQuery($from, $to)
            ->groupByRaw($paidRaw)
            ->selectRaw("$paidRaw as bucket, SUM(amount_paid_cents) as collected_cents")
            ->get()
            ->keyBy('bucket');

        $rows = [];
        foreach ($this->bucketsBetween($from, $to, $granularity) as $bucket) {
            $rows[] = [
                'bucket' => $bucket,
                'booked_cents' => (int) ($booked[$bucket]->booked_cents ?? 0),
                'collected_cents' => (int) ($collected[$bucket]->collected_cents ?? 0),
                'booked_appointments' => (int) ($booked[$bucket]->booked_appointments ?? 0),
            ];
        }

        return $rows;
    }

    private function bookedQuery(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        $start = $from->startOfDay();
        $end = $to->endOfDay();

        return Appointment::query()
            ->from('appointments')
            ->join('services', 'services.id', '=', 'appointments.service_id')
            ->where('appointments.status', Appointment::STATUS_CONFIRMED)
            ->whereBetween('appointments.starts_at', [$start, $end]);
    }

    private function collectedQuery(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        $start = $from->startOfDay();
        $end = $to->endOfDay();

        return Appointment::query()
            ->from('appointments')
            ->whereNotNull('appointments.paid_at')
            ->whereBetween('appointments.paid_at', [$start, $end]);
    }

    private function refundedQuery(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        $start = $from->startOfDay();
        $end = $to->endOfDay();

        return Appointment::query()
            ->from('appointments')
            ->whereNotNull('appointments.refunded_at')
            ->whereBetween('appointments.refunded_at', [$start, $end]);
    }

    private function bookedSeriesExpression(string $granularity): string
    {
        return $this->bucketExpression('appointments.starts_at', $granularity);
    }

    private function paidSeriesExpression(string $granularity): string
    {
        return $this->bucketExpression('appointments.paid_at', $granularity);
    }

    private function bucketExpression(string $column, string $granularity): string
    {
        $driver = DB::connection()->getDriverName();
        $format = $granularity === self::GRANULARITY_MONTH ? '%Y-%m' : '%Y-%m-%d';

        if ($driver === 'sqlite') {
            return "strftime('$format', $column)";
        }
        if ($driver === 'pgsql') {
            $pgFormat = $granularity === self::GRANULARITY_MONTH ? 'YYYY-MM' : 'YYYY-MM-DD';

            return "to_char($column, '$pgFormat')";
        }

        // MySQL / MariaDB.
        return "DATE_FORMAT($column, '$format')";
    }

    /**
     * @return list<string>
     */
    private function bucketsBetween(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $granularity,
    ): array {
        $start = $granularity === self::GRANULARITY_MONTH
            ? $from->startOfMonth()
            : $from->startOfDay();
        $end = $granularity === self::GRANULARITY_MONTH
            ? $to->endOfMonth()
            : $to->endOfDay();
        $interval = $granularity === self::GRANULARITY_MONTH ? '1 month' : '1 day';
        $format = $granularity === self::GRANULARITY_MONTH ? 'Y-m' : 'Y-m-d';

        $buckets = [];
        $period = CarbonPeriod::create($start, $interval, $end);
        foreach ($period as $point) {
            $buckets[] = $point->format($format);
        }

        return array_values(array_unique($buckets));
    }
}
