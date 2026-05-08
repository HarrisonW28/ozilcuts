<?php

namespace App\Services\Reports;

use App\Models\Appointment;
use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Customer-base analytics.
 *
 * Period semantics:
 *  - "in period" filters appointments by appointments.starts_at in [from, to]
 *    and status = confirmed.
 *  - "new customer in period" = first ever confirmed appointment for that
 *    customer falls inside [from, to].
 *  - "returning customer in period" = has a confirmed appointment inside
 *    [from, to] AND another confirmed appointment strictly before `from`.
 *
 * Lifetime stats (per-customer drill-in):
 *  - Use ALL confirmed appointments, not just the period.
 *  - "total_spent_cents" sums amount_paid_cents (collected deposits) so it
 *    matches what's in our bank account, not gross billable.
 *  - "avg_interval_days" = avg of consecutive deltas across confirmed
 *    appointment dates; null if fewer than 2 visits.
 */
final class CustomerAnalyticsService
{
    public const TOP_LIMIT = 10;

    public const HISTORY_LIMIT = 50;

    /**
     * Lifetime value buckets (cents). Boundaries are inclusive of the lower
     * bound and exclusive of the upper bound, except the last bucket which
     * has no upper bound.
     */
    private const LTV_BUCKETS = [
        ['label' => '$0', 'min' => 0, 'max' => 1],
        ['label' => '$0.01–$50', 'min' => 1, 'max' => 5000],
        ['label' => '$50–$100', 'min' => 5000, 'max' => 10000],
        ['label' => '$100–$250', 'min' => 10000, 'max' => 25000],
        ['label' => '$250–$500', 'min' => 25000, 'max' => 50000],
        ['label' => '$500+', 'min' => 50000, 'max' => null],
    ];

    /**
     * @return array{
     *     from: string,
     *     to: string,
     *     active_customers: int,
     *     new_customers: int,
     *     returning_customers: int,
     *     visits_total: int,
     *     visits_per_customer_avg: float,
     *     avg_interval_days: float|null,
     *     ltv_distribution: list<array{label: string, min_cents: int, max_cents: int|null, customers: int}>,
     *     top_spenders: list<array{customer_user_id: int, customer_name: string, visits: int, total_spent_cents: int, last_visit_at: string|null}>,
     *     top_visitors: list<array{customer_user_id: int, customer_name: string, visits: int, total_spent_cents: int, last_visit_at: string|null}>,
     * }
     */
    public function aggregate(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $start = $from->startOfDay();
        $end = $to->endOfDay();

        $inPeriod = Appointment::query()
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [$start, $end]);

        $activeCustomers = (int) (clone $inPeriod)
            ->distinct('customer_user_id')
            ->count('customer_user_id');
        $visitsTotal = (int) (clone $inPeriod)->count();

        $visitsPerCustomerAvg = $activeCustomers > 0
            ? round($visitsTotal / $activeCustomers, 2)
            : 0.0;

        $newCustomers = $this->newCustomersCount($start, $end);
        $returningCustomers = $this->returningCustomersCount($start, $end);

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'active_customers' => $activeCustomers,
            'new_customers' => $newCustomers,
            'returning_customers' => $returningCustomers,
            'visits_total' => $visitsTotal,
            'visits_per_customer_avg' => $visitsPerCustomerAvg,
            'avg_interval_days' => $this->avgIntervalDays($start, $end),
            'ltv_distribution' => $this->lifetimeValueDistribution(),
            'top_spenders' => $this->topSpenders($start, $end),
            'top_visitors' => $this->topVisitors($start, $end),
        ];
    }

    /**
     * @return array{
     *     customer_user_id: int,
     *     customer_name: string,
     *     customer_email: string,
     *     total_visits: int,
     *     total_spent_cents: int,
     *     total_booked_cents: int,
     *     first_visit_at: string|null,
     *     last_visit_at: string|null,
     *     avg_interval_days: float|null,
     *     preferred_barber: array{user_id: int, name: string}|null,
     *     visits_by_status: array{confirmed: int, cancelled: int},
     * }
     */
    public function forCustomer(User $customer): array
    {
        $confirmed = Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CONFIRMED);

        $visits = (int) (clone $confirmed)->count();
        $totalSpent = (int) (clone $confirmed)
            ->whereNotNull('paid_at')
            ->sum('amount_paid_cents');
        $totalBooked = (int) (clone $confirmed)
            ->join('services', 'services.id', '=', 'appointments.service_id')
            ->sum('services.price_cents');
        $first = (clone $confirmed)->orderBy('starts_at')->value('starts_at');
        $last = (clone $confirmed)->orderByDesc('starts_at')->value('starts_at');

        $cancelled = (int) Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CANCELLED)
            ->count();

        $preferredBarber = null;
        $top = (clone $confirmed)
            ->join('users as barbers', 'barbers.id', '=', 'appointments.barber_user_id')
            ->groupBy('appointments.barber_user_id', 'barbers.name')
            ->selectRaw('appointments.barber_user_id as barber_user_id, barbers.name as barber_name, COUNT(*) as cnt')
            ->orderByDesc('cnt')
            ->orderByDesc('barbers.name')
            ->first();
        if ($top !== null) {
            $preferredBarber = [
                'user_id' => (int) $top->barber_user_id,
                'name' => (string) $top->barber_name,
            ];
        }

        return [
            'customer_user_id' => (int) $customer->id,
            'customer_name' => (string) $customer->name,
            'customer_email' => (string) $customer->email,
            'total_visits' => $visits,
            'total_spent_cents' => $totalSpent,
            'total_booked_cents' => $totalBooked,
            'first_visit_at' => $first ? CarbonImmutable::parse((string) $first)->toIso8601String() : null,
            'last_visit_at' => $last ? CarbonImmutable::parse((string) $last)->toIso8601String() : null,
            'avg_interval_days' => $this->avgIntervalDaysForCustomer((int) $customer->id),
            'preferred_barber' => $preferredBarber,
            'visits_by_status' => [
                'confirmed' => $visits,
                'cancelled' => $cancelled,
            ],
        ];
    }

    /**
     * Most recent appointments for the customer, oldest first reversed
     * (newest first), capped at HISTORY_LIMIT.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, Appointment>
     */
    public function historyForCustomer(User $customer)
    {
        return Appointment::query()
            ->with(['service', 'barber'])
            ->where('customer_user_id', $customer->id)
            ->orderByDesc('starts_at')
            ->limit(self::HISTORY_LIMIT)
            ->get();
    }

    /**
     * @return list<array{customer_user_id: int, customer_name: string, visits: int, total_spent_cents: int, last_visit_at: string|null}>
     */
    private function topSpenders(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $rows = $this->customersInPeriodQuery($start, $end)
            ->selectRaw('appointments.customer_user_id as customer_user_id, customers.name as customer_name, COUNT(*) as visits, SUM(COALESCE(appointments.amount_paid_cents, 0)) as total_spent_cents, MAX(appointments.starts_at) as last_visit_at')
            ->groupBy('appointments.customer_user_id', 'customers.name')
            ->orderByDesc('total_spent_cents')
            ->orderByDesc('visits')
            ->limit(self::TOP_LIMIT)
            ->get();

        return $this->serializeCustomerRanking($rows);
    }

    /**
     * @return list<array{customer_user_id: int, customer_name: string, visits: int, total_spent_cents: int, last_visit_at: string|null}>
     */
    private function topVisitors(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $rows = $this->customersInPeriodQuery($start, $end)
            ->selectRaw('appointments.customer_user_id as customer_user_id, customers.name as customer_name, COUNT(*) as visits, SUM(COALESCE(appointments.amount_paid_cents, 0)) as total_spent_cents, MAX(appointments.starts_at) as last_visit_at')
            ->groupBy('appointments.customer_user_id', 'customers.name')
            ->orderByDesc('visits')
            ->orderByDesc('total_spent_cents')
            ->limit(self::TOP_LIMIT)
            ->get();

        return $this->serializeCustomerRanking($rows);
    }

    /**
     * @param  Collection<int, object>  $rows
     * @return list<array{customer_user_id: int, customer_name: string, visits: int, total_spent_cents: int, last_visit_at: string|null}>
     */
    private function serializeCustomerRanking($rows): array
    {
        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'customer_user_id' => (int) $row->customer_user_id,
                'customer_name' => (string) $row->customer_name,
                'visits' => (int) $row->visits,
                'total_spent_cents' => (int) $row->total_spent_cents,
                'last_visit_at' => $row->last_visit_at
                    ? CarbonImmutable::parse((string) $row->last_visit_at)->toIso8601String()
                    : null,
            ];
        }

        return $out;
    }

    private function customersInPeriodQuery(CarbonImmutable $start, CarbonImmutable $end): Builder
    {
        return Appointment::query()
            ->from('appointments')
            ->join('users as customers', 'customers.id', '=', 'appointments.customer_user_id')
            ->where('appointments.status', Appointment::STATUS_CONFIRMED)
            ->whereBetween('appointments.starts_at', [$start, $end]);
    }

    private function newCustomersCount(CarbonImmutable $start, CarbonImmutable $end): int
    {
        // Customers whose first ever confirmed appointment is inside [start, end].
        $first = Appointment::query()
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->selectRaw('customer_user_id, MIN(starts_at) as first_at')
            ->groupBy('customer_user_id');

        return (int) DB::query()
            ->fromSub($first, 'firsts')
            ->whereBetween('firsts.first_at', [$start, $end])
            ->count();
    }

    private function returningCustomersCount(CarbonImmutable $start, CarbonImmutable $end): int
    {
        // Customers with confirmed appt in [start, end] AND another before start.
        $inPeriodIds = Appointment::query()
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [$start, $end])
            ->distinct()
            ->pluck('customer_user_id');
        if ($inPeriodIds->isEmpty()) {
            return 0;
        }

        return (int) Appointment::query()
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('starts_at', '<', $start)
            ->whereIn('customer_user_id', $inPeriodIds)
            ->distinct()
            ->count('customer_user_id');
    }

    /**
     * Average days between consecutive confirmed appointments across all
     * customers active in the period. Null if no customer has 2+ visits.
     */
    private function avgIntervalDays(CarbonImmutable $start, CarbonImmutable $end): ?float
    {
        $customerIds = Appointment::query()
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [$start, $end])
            ->distinct()
            ->pluck('customer_user_id');
        if ($customerIds->isEmpty()) {
            return null;
        }

        $totalDeltaDays = 0.0;
        $deltaCount = 0;
        foreach ($customerIds as $customerId) {
            $dates = Appointment::query()
                ->where('customer_user_id', $customerId)
                ->where('status', Appointment::STATUS_CONFIRMED)
                ->orderBy('starts_at')
                ->pluck('starts_at')
                ->all();
            for ($i = 1; $i < count($dates); $i++) {
                $prev = CarbonImmutable::parse((string) $dates[$i - 1]);
                $curr = CarbonImmutable::parse((string) $dates[$i]);
                $totalDeltaDays += $prev->diffInDays($curr);
                $deltaCount++;
            }
        }

        return $deltaCount > 0
            ? round($totalDeltaDays / $deltaCount, 1)
            : null;
    }

    private function avgIntervalDaysForCustomer(int $customerId): ?float
    {
        $dates = Appointment::query()
            ->where('customer_user_id', $customerId)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->orderBy('starts_at')
            ->pluck('starts_at')
            ->all();

        if (count($dates) < 2) {
            return null;
        }

        $total = 0.0;
        $deltas = 0;
        for ($i = 1; $i < count($dates); $i++) {
            $prev = CarbonImmutable::parse((string) $dates[$i - 1]);
            $curr = CarbonImmutable::parse((string) $dates[$i]);
            $total += $prev->diffInDays($curr);
            $deltas++;
        }

        return $deltas > 0 ? round($total / $deltas, 1) : null;
    }

    /**
     * Lifetime collected spend per customer, bucketed.
     *
     * @return list<array{label: string, min_cents: int, max_cents: int|null, customers: int}>
     */
    private function lifetimeValueDistribution(): array
    {
        // Sum collected (paid_at not null) per customer with the customer role.
        $rows = User::query()
            ->whereHas('role', fn (Builder $q) => $q->where('slug', Role::SLUG_CUSTOMER))
            ->leftJoin('appointments', function ($join) {
                $join->on('appointments.customer_user_id', '=', 'users.id')
                    ->whereNotNull('appointments.paid_at');
            })
            ->groupBy('users.id')
            ->selectRaw('users.id as user_id, COALESCE(SUM(appointments.amount_paid_cents), 0) as ltv_cents')
            ->get();

        $buckets = [];
        foreach (self::LTV_BUCKETS as $bucket) {
            $buckets[] = [
                'label' => $bucket['label'],
                'min_cents' => $bucket['min'],
                'max_cents' => $bucket['max'],
                'customers' => 0,
            ];
        }

        foreach ($rows as $row) {
            $cents = (int) $row->ltv_cents;
            foreach ($buckets as $idx => $bucket) {
                $min = (int) $bucket['min_cents'];
                $max = $bucket['max_cents'];
                if ($cents >= $min && ($max === null || $cents < $max)) {
                    $buckets[$idx]['customers']++;
                    break;
                }
            }
        }

        return $buckets;
    }
}
