<?php

namespace App\Services\Booking;

use App\Models\Appointment;
use App\Models\Role;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Conversion-focused hints for the public booking flow: preferred hours,
 * affinity with barber+service, repeat cadence, and recent cancellations.
 */
final class SmartSlotRecommendationService
{
    public function __construct(
        private readonly RebookSuggestionService $rebookSuggestions,
    ) {}

    /**
     * @return array{
     *     date: string,
     *     service_id: int,
     *     barber_user_id: int,
     *     personalized: bool,
     *     preferred_time_windows: list<array{hour_start: int, hour_end: int, weight: float, label: string}>,
     *     affinity: array{score: int, label: string, visits_pair: int, visits_with_barber: int}|null,
     *     repeat_booking: array{predicted_next_date: string, sample_size: int}|null,
     *     cancellation_match: array{recent_cancellations_on_day: int, hint: string|null},
     * }
     */
    public function forBarberServiceDate(
        User $barber,
        Service $service,
        CarbonImmutable $date,
        ?User $viewer,
    ): array {
        $dayStart = $date->startOfDay();
        $dayEnd = $date->endOfDay();
        $tz = (string) config('app.timezone', 'UTC');

        $customer = $this->resolveCustomerViewer($viewer);

        $preferred = $customer !== null
            ? $this->preferredWindows($customer, $barber, $service, $tz)
            : [];

        $affinity = $customer !== null
            ? $this->affinity($customer, $barber, $service)
            : null;

        $repeat = null;
        if ($customer !== null) {
            $sample = Appointment::query()
                ->where('customer_user_id', $customer->id)
                ->where('barber_user_id', $barber->id)
                ->where('service_id', $service->id)
                ->where('status', Appointment::STATUS_CONFIRMED)
                ->whereNotNull('starts_at')
                ->where('starts_at', '<', CarbonImmutable::now())
                ->count();
            $next = $this->rebookSuggestions->suggestedDateForPair(
                $customer,
                (int) $barber->id,
                (int) $service->id,
            );
            if ($next !== null) {
                $repeat = [
                    'predicted_next_date' => $next,
                    'sample_size' => (int) $sample,
                ];
            }
        }

        $cancelCount = Appointment::query()
            ->where('barber_user_id', $barber->id)
            ->where('status', Appointment::STATUS_CANCELLED)
            ->whereBetween('starts_at', [$dayStart, $dayEnd])
            ->where('updated_at', '>=', CarbonImmutable::now()->subHours(72))
            ->count();

        $cancelHint = $this->cancellationHint($cancelCount);

        return [
            'date' => $date->toDateString(),
            'service_id' => (int) $service->id,
            'barber_user_id' => (int) $barber->id,
            'personalized' => $customer !== null,
            'preferred_time_windows' => $preferred,
            'affinity' => $affinity,
            'repeat_booking' => $repeat,
            'cancellation_match' => [
                'recent_cancellations_on_day' => (int) $cancelCount,
                'hint' => $cancelHint,
            ],
        ];
    }

    private function resolveCustomerViewer(?User $viewer): ?User
    {
        if ($viewer === null) {
            return null;
        }
        if (! $viewer->hasRole(Role::SLUG_CUSTOMER)) {
            return null;
        }

        return $viewer;
    }

    /**
     * @return list<array{hour_start: int, hour_end: int, weight: float, label: string}>
     */
    private function preferredWindows(User $customer, User $barber, Service $service, string $tz): array
    {
        $rows = Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('barber_user_id', $barber->id)
            ->where('service_id', $service->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<', CarbonImmutable::now())
            ->orderByDesc('starts_at')
            ->limit(40)
            ->pluck('starts_at');

        if ($rows->isEmpty()) {
            return [];
        }

        $counts = [];
        foreach ($rows as $start) {
            $h = CarbonImmutable::parse((string) $start, $tz)->hour;
            $counts[$h] = ($counts[$h] ?? 0) + 1;
        }

        arsort($counts);
        $top = array_slice($counts, 0, 3, true);
        $max = max($counts) ?: 1;

        $out = [];
        foreach ($top as $hour => $count) {
            $out[] = [
                'hour_start' => (int) $hour,
                'hour_end' => ((int) $hour + 1) % 24,
                'weight' => round($count / $max, 2),
                'label' => $this->hourWindowLabel((int) $hour, $tz),
            ];
        }

        return $out;
    }

    private function hourWindowLabel(int $hourStart, string $tz): string
    {
        $a = CarbonImmutable::today($tz)->setTime($hourStart, 0);
        $b = $a->addHour();

        return $a->format('g:i').'–'.$b->format('g:i a');
    }

    /**
     * @return array{score: int, label: string, visits_pair: int, visits_with_barber: int}|null
     */
    private function affinity(User $customer, User $barber, Service $service): ?array
    {
        $pair = (int) Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('barber_user_id', $barber->id)
            ->where('service_id', $service->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<', CarbonImmutable::now())
            ->count();

        if ($pair === 0) {
            return null;
        }

        $withBarber = (int) Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('barber_user_id', $barber->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<', CarbonImmutable::now())
            ->count();

        $focus = $withBarber > 0 ? $pair / $withBarber : 1.0;
        $score = (int) min(100, round(28 + min($pair, 10) * 7 + $focus * 22));

        $label = match (true) {
            $score >= 82 => 'You book this cut here often — locking a slot takes seconds.',
            $score >= 58 => 'Nice rhythm with this chair and service.',
            default => 'Every visit sharpens the next suggestion.',
        };

        return [
            'score' => $score,
            'label' => $label,
            'visits_pair' => $pair,
            'visits_with_barber' => $withBarber,
        ];
    }

    private function cancellationHint(int $count): ?string
    {
        if ($count <= 0) {
            return null;
        }
        if ($count === 1) {
            return 'A slot just reopened today — earlier times below may be easier to grab.';
        }

        return 'Several slots freed up today — check earlier times for a quicker chair.';
    }
}
