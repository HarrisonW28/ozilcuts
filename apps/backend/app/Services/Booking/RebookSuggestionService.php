<?php

namespace App\Services\Booking;

use App\Models\Appointment;
use App\Models\User;
use Carbon\CarbonImmutable;

final class RebookSuggestionService
{
    public const DEFAULT_INTERVAL_DAYS = 28;

    public const MIN_INTERVAL_DAYS = 7;

    public const MAX_INTERVAL_DAYS = 180;

    /**
     * Build a suggestion for re-booking the same service+barber as the given
     * appointment. Returns null when the source appointment lacks the data
     * needed to rebook (e.g. customer/service/barber missing).
     *
     * @return array{
     *     interval_days: int,
     *     sample_size: int,
     *     suggested_date: string,
     *     last_appointment_at: string|null,
     *     barber_user_id: int,
     *     service_id: int,
     * }|null
     */
    public function forAppointment(Appointment $appointment): ?array
    {
        $appointment->loadMissing(['service', 'barber', 'customer']);
        if (
            $appointment->service === null
            || $appointment->barber === null
            || $appointment->customer === null
        ) {
            return null;
        }

        return $this->buildSuggestion(
            customer: $appointment->customer,
            barberUserId: (int) $appointment->barber_user_id,
            serviceId: (int) $appointment->service_id,
            sourceAppointment: $appointment,
        );
    }

    /**
     * Build a suggestion for the customer's next visit, based on their most
     * recent confirmed past appointment. Returns null if they have none.
     *
     * @return array{
     *     interval_days: int,
     *     sample_size: int,
     *     suggested_date: string,
     *     last_appointment_at: string|null,
     *     barber_user_id: int,
     *     service_id: int,
     * }|null
     */
    public function nextVisitFor(User $customer): ?array
    {
        $latest = Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('starts_at', '<', CarbonImmutable::now())
            ->orderByDesc('starts_at')
            ->with(['service', 'barber'])
            ->first();

        if ($latest === null) {
            return null;
        }

        return $this->forAppointment($latest);
    }

    /**
     * @return array{
     *     interval_days: int,
     *     sample_size: int,
     *     suggested_date: string,
     *     last_appointment_at: string|null,
     *     barber_user_id: int,
     *     service_id: int,
     * }
     */
    private function buildSuggestion(
        User $customer,
        int $barberUserId,
        int $serviceId,
        Appointment $sourceAppointment,
    ): array {
        $sourceStart = $sourceAppointment->starts_at !== null
            ? CarbonImmutable::parse((string) $sourceAppointment->starts_at)
            : CarbonImmutable::now();

        $history = Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('barber_user_id', $barberUserId)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<=', $sourceStart)
            ->orderBy('starts_at')
            ->pluck('starts_at')
            ->all();

        $intervalDays = self::DEFAULT_INTERVAL_DAYS;
        $sampleSize = count($history);

        if ($sampleSize >= 2) {
            $totalDays = 0;
            $deltas = 0;
            for ($i = 1; $i < $sampleSize; $i++) {
                $prev = CarbonImmutable::parse((string) $history[$i - 1]);
                $curr = CarbonImmutable::parse((string) $history[$i]);
                $diff = $prev->diffInDays($curr);
                if ($diff > 0) {
                    $totalDays += $diff;
                    $deltas++;
                }
            }
            if ($deltas > 0) {
                $intervalDays = (int) round($totalDays / $deltas);
            }
        }

        $intervalDays = max(self::MIN_INTERVAL_DAYS, min(self::MAX_INTERVAL_DAYS, $intervalDays));

        $suggested = $sourceStart->addDays($intervalDays)->startOfDay();
        $tomorrow = CarbonImmutable::now()->addDay()->startOfDay();
        if ($suggested->lessThan($tomorrow)) {
            $suggested = $tomorrow;
        }

        return [
            'interval_days' => $intervalDays,
            'sample_size' => $sampleSize,
            'suggested_date' => $suggested->toDateString(),
            'last_appointment_at' => $sourceAppointment->starts_at?->toIso8601String(),
            'barber_user_id' => $barberUserId,
            'service_id' => $serviceId,
        ];
    }
}
