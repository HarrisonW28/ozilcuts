<?php

namespace App\Services\Reports;

use App\Models\Appointment;
use App\Models\BarberProfile;
use App\Models\Role;
use App\Models\User;
use App\Services\Appointments\QueueWaitIntelligenceService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Multi-chair operational intelligence for busy shop floors: live chair states,
 * utilization, queue balance hints, workload visibility, and day analytics.
 */
final class ShopOperationalIntelligenceService
{
    public function __construct(
        private readonly QueueWaitIntelligenceService $queue,
        private readonly BarberAnalyticsService $analytics,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function liveSnapshot(?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $nowMs = (int) ($now->getTimestamp() * 1000);
        $dayStart = $now->startOfDay();
        $dayEnd = $now->endOfDay();
        $dayYmd = $now->toDateString();

        $barbers = User::query()
            ->whereHas('role', fn ($q) => $q->where('slug', Role::SLUG_BARBER))
            ->whereHas('barberProfile', fn ($q) => $q->where('is_published', true))
            ->with('barberProfile')
            ->orderBy('name')
            ->get();

        $barberIds = $barbers->pluck('id')->all();

        /** @var Collection<int, Collection<int, Appointment>> $byBarber */
        $byBarber = Appointment::query()
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [$dayStart, $dayEnd])
            ->whereIn('barber_user_id', $barberIds)
            ->with(['service', 'customer'])
            ->orderBy('starts_at')
            ->get()
            ->groupBy('barber_user_id');

        $chairs = [];
        $guestsWaitingTotal = 0;
        $behindTotal = 0;
        $chairsInUse = 0;
        $confirmedToday = 0;
        $remainingToday = 0;
        $utilizationSum = 0.0;
        $utilizationCount = 0;

        foreach ($barbers as $barber) {
            /** @var Collection<int, Appointment> $queue */
            $queue = $byBarber->get($barber->id, collect());
            $metrics = $this->queue->barberDayMetrics($queue, $nowMs);
            $util = $this->analytics->summary($barber, $dayStart, $dayEnd);

            $confirmedToday += (int) $util['appointments_confirmed'];
            $remainingToday += $metrics['remaining_visits'];
            $guestsWaitingTotal += $metrics['waiting_count'];
            $behindTotal += $metrics['behind_count'];
            if ($metrics['chair_in_use']) {
                $chairsInUse++;
            }

            $utilPct = (float) $util['utilization_pct'];
            if ((int) $util['available_minutes'] > 0) {
                $utilizationSum += $utilPct;
                $utilizationCount++;
            }

            $chairs[] = [
                'barber_user_id' => (int) $barber->id,
                'barber_name' => (string) $barber->name,
                'barber_title' => $barber->barberProfile?->title,
                'chair' => [
                    'state' => $this->chairState($metrics),
                    'in_use' => $metrics['chair_in_use'],
                    'serving' => $metrics['serving_appointment_id'] === null ? null : [
                        'appointment_id' => $metrics['serving_appointment_id'],
                        'customer_name' => $metrics['serving_customer_name'],
                        'service_name' => $metrics['serving_service_name'],
                    ],
                ],
                'utilization' => [
                    'booked_minutes' => (int) $util['booked_minutes'],
                    'available_minutes' => (int) $util['available_minutes'],
                    'utilization_pct' => $utilPct,
                ],
                'workload' => [
                    'confirmed_today' => (int) $util['appointments_confirmed'],
                    'remaining_today' => $metrics['remaining_visits'],
                    'completed_today' => $metrics['completed_visits'],
                    'waiting_count' => $metrics['waiting_count'],
                    'behind_count' => $metrics['behind_count'],
                    'lounge_guests' => $metrics['lounge_guests'],
                ],
                'queue' => [
                    'pace_tone' => $metrics['behind_count'] > 0 ? 'behind' : 'calm',
                    'visits_behind_schedule' => $metrics['behind_count'],
                ],
            ];
        }

        $avgUtilization = $utilizationCount > 0
            ? round($utilizationSum / $utilizationCount, 4)
            : 0.0;

        return [
            'snapshot_date' => $dayYmd,
            'updated_at' => $now->toIso8601String(),
            'shop_summary' => [
                'chairs_total' => count($chairs),
                'chairs_in_use' => $chairsInUse,
                'chairs_open' => max(0, count($chairs) - $chairsInUse),
                'guests_waiting_total' => $guestsWaitingTotal,
                'behind_visits_total' => $behindTotal,
                'confirmed_today' => $confirmedToday,
                'remaining_today' => $remainingToday,
                'avg_utilization_pct' => $avgUtilization,
            ],
            'chairs' => $chairs,
            'queue_balance' => $this->queueBalance($chairs),
            'analytics' => [
                'booked_minutes_total' => array_sum(array_column(array_column($chairs, 'utilization'), 'booked_minutes')),
                'available_minutes_total' => array_sum(array_column(array_column($chairs, 'utilization'), 'available_minutes')),
                'shop_utilization_pct' => $this->shopUtilization($chairs),
            ],
        ];
    }

    /**
     * @param  array{
     *     chair_in_use: bool,
     *     waiting_count: int,
     *     behind_count: int,
     * }  $metrics
     */
    private function chairState(array $metrics): string
    {
        if ($metrics['chair_in_use']) {
            return 'in_use';
        }
        if ($metrics['behind_count'] > 0) {
            return 'catching_up';
        }
        if ($metrics['waiting_count'] > 0) {
            return 'guests_waiting';
        }

        return 'open';
    }

    /**
     * @param  list<array<string, mixed>>  $chairs
     * @return array{headline: string, hints: list<array{tone: string, message: string, barber_user_id: int|null}>}
     */
    private function queueBalance(array $chairs): array
    {
        if ($chairs === []) {
            return [
                'headline' => 'No published chairs today.',
                'hints' => [],
            ];
        }

        $hints = [];

        usort($chairs, fn (array $a, array $b) => ($b['workload']['waiting_count'] ?? 0) <=> ($a['workload']['waiting_count'] ?? 0));
        $busiest = $chairs[0];
        $busiestWait = (int) ($busiest['workload']['waiting_count'] ?? 0);

        $openChairs = array_values(array_filter(
            $chairs,
            fn (array $c) => ($c['chair']['in_use'] ?? false) === false
                && (int) ($c['utilization']['available_minutes'] ?? 0) > 0
                && (float) ($c['utilization']['utilization_pct'] ?? 1) < 0.55,
        ));

        if ($busiestWait >= 2 && $openChairs !== []) {
            $target = $openChairs[0];
            $hints[] = [
                'tone' => 'balance',
                'message' => sprintf(
                    '%s has %d waiting — %s has chair capacity for walk-ins or overflow.',
                    (string) $busiest['barber_name'],
                    $busiestWait,
                    (string) $target['barber_name'],
                ),
                'barber_user_id' => (int) $target['barber_user_id'],
            ];
        }

        $behindTotal = array_sum(array_map(
            fn (array $c) => (int) ($c['workload']['behind_count'] ?? 0),
            $chairs,
        ));
        if ($behindTotal >= 2) {
            $hints[] = [
                'tone' => 'pace',
                'message' => 'A few visits are catching up on time — keep comms calm and seat guests in arrival order.',
                'barber_user_id' => null,
            ];
        }

        $lowUtil = array_values(array_filter(
            $chairs,
            fn (array $c) => (int) ($c['utilization']['available_minutes'] ?? 0) > 60
                && (float) ($c['utilization']['utilization_pct'] ?? 0) < 0.35
                && (int) ($c['workload']['remaining_today'] ?? 0) > 0,
        ));
        if ($lowUtil !== [] && $busiestWait >= 1) {
            $hints[] = [
                'tone' => 'capacity',
                'message' => sprintf(
                    '%s has lighter utilization today — good chair for flexible bookings.',
                    (string) $lowUtil[0]['barber_name'],
                ),
                'barber_user_id' => (int) $lowUtil[0]['barber_user_id'],
            ];
        }

        $chairsInUse = count(array_filter(
            $chairs,
            fn (array $c) => ($c['chair']['in_use'] ?? false) === true,
        ));

        $headline = match (true) {
            $behindTotal >= 2 => 'Shop is easing pace — balance chairs and keep guests informed.',
            $busiestWait >= 2 => 'Uneven wait lines — steer overflow to open chairs.',
            $chairsInUse === count($chairs) && count($chairs) > 0 => 'All chairs are busy — great momentum.',
            default => 'Floor looks steady — chairs and lounge are in a good rhythm.',
        };

        return [
            'headline' => $headline,
            'hints' => array_slice($hints, 0, 4),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $chairs
     */
    private function shopUtilization(array $chairs): float
    {
        $booked = 0;
        $available = 0;
        foreach ($chairs as $c) {
            $booked += (int) ($c['utilization']['booked_minutes'] ?? 0);
            $available += (int) ($c['utilization']['available_minutes'] ?? 0);
        }

        if ($available <= 0) {
            return 0.0;
        }

        return round(min(1.0, $booked / $available), 4);
    }
}
