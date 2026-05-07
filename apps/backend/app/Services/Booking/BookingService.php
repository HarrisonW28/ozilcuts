<?php

namespace App\Services\Booking;

use App\Models\Appointment;
use App\Models\BarberProfile;
use App\Models\Role;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class BookingService
{
    /**
     * Compute available slot start times (ISO 8601, naive local) for a barber + service on a date.
     *
     * Slots step by the service duration so that no two suggested slots can overlap.
     * Each candidate slot must:
     *   - fit entirely within an availability window on that weekday,
     *   - not overlap any existing non-cancelled appointment,
     *   - not be in the past.
     *
     * @return list<string> ISO 8601 timestamps (`Y-m-d\TH:i:s`)
     */
    public function availableSlots(User $barber, Service $service, CarbonImmutable $date): array
    {
        $profile = $barber->barberProfile;
        if ($profile === null || ! $profile->is_published) {
            return [];
        }
        if (! $barber->hasRole(Role::SLUG_BARBER)) {
            return [];
        }
        if (! $service->is_active) {
            return [];
        }

        $duration = (int) $service->duration_minutes;
        if ($duration < 1) {
            return [];
        }

        $weekday = (int) $date->dayOfWeek;
        $windows = $profile->availabilityWindows()
            ->where('weekday', $weekday)
            ->orderBy('starts_at')
            ->get(['starts_at', 'ends_at']);

        if ($windows->isEmpty()) {
            return [];
        }

        $dayStart = $date->setTime(0, 0, 0);
        $existing = Appointment::query()
            ->where('barber_user_id', $barber->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [
                $dayStart->toDateTimeString(),
                $dayStart->addDay()->toDateTimeString(),
            ])
            ->orderBy('starts_at')
            ->get(['starts_at', 'ends_at']);

        $now = CarbonImmutable::now();

        $slots = [];
        foreach ($windows as $window) {
            $winStart = $this->combineDateTime($date, (string) $window->starts_at);
            $winEnd = $this->combineDateTime($date, (string) $window->ends_at);

            $cursor = $winStart;
            while ($cursor->copy()->addMinutes($duration)->lessThanOrEqualTo($winEnd)) {
                $slotStart = $cursor;
                $slotEnd = $cursor->addMinutes($duration);

                if ($slotEnd->lessThanOrEqualTo($now)) {
                    $cursor = $slotEnd;

                    continue;
                }

                $clash = false;
                foreach ($existing as $appt) {
                    $aStart = CarbonImmutable::parse((string) $appt->starts_at);
                    $aEnd = CarbonImmutable::parse((string) $appt->ends_at);
                    if ($slotStart->lessThan($aEnd) && $slotEnd->greaterThan($aStart)) {
                        $clash = true;
                        break;
                    }
                }

                if (! $clash) {
                    $slots[] = $slotStart->format('Y-m-d\TH:i:s');
                }

                $cursor = $slotEnd;
            }
        }

        return $slots;
    }

    /**
     * @param  array{service_id: int, barber_user_id: int, starts_at: string, notes?: string|null}  $data
     */
    public function book(User $customer, array $data): Appointment
    {
        $service = Service::query()->where('is_active', true)->findOrFail($data['service_id']);
        $barber = User::query()->findOrFail($data['barber_user_id']);
        if (! $barber->hasRole(Role::SLUG_BARBER)) {
            throw new RuntimeException('Selected user is not a barber.');
        }

        $profile = $barber->barberProfile;
        if (! $profile instanceof BarberProfile || ! $profile->is_published) {
            throw new RuntimeException('Barber is not bookable.');
        }

        $start = CarbonImmutable::parse($data['starts_at']);
        $end = $start->addMinutes((int) $service->duration_minutes);

        $weekday = (int) $start->dayOfWeek;
        $startTime = $start->format('H:i:s');
        $endTime = $end->format('H:i:s');

        $coversWindow = $profile->availabilityWindows()
            ->where('weekday', $weekday)
            ->where('starts_at', '<=', $startTime)
            ->where('ends_at', '>=', $endTime)
            ->exists();

        if (! $coversWindow) {
            throw new RuntimeException('Selected time is outside the barber’s availability.');
        }

        return DB::transaction(function () use ($service, $barber, $customer, $start, $end, $data) {
            $overlap = Appointment::query()
                ->where('barber_user_id', $barber->id)
                ->where('status', Appointment::STATUS_CONFIRMED)
                ->where('starts_at', '<', $end->toDateTimeString())
                ->where('ends_at', '>', $start->toDateTimeString())
                ->lockForUpdate()
                ->exists();

            if ($overlap) {
                throw new RuntimeException('Selected time is no longer available.');
            }

            return Appointment::query()->create([
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'customer_user_id' => $customer->id,
                'starts_at' => $start->toDateTimeString(),
                'ends_at' => $end->toDateTimeString(),
                'status' => Appointment::STATUS_CONFIRMED,
                'notes' => $data['notes'] ?? null,
            ]);
        });
    }

    private function combineDateTime(CarbonImmutable $date, string $time): CarbonImmutable
    {
        $parts = explode(':', $time);
        $h = (int) ($parts[0] ?? 0);
        $m = (int) ($parts[1] ?? 0);
        $s = isset($parts[2]) ? (int) $parts[2] : 0;

        return $date->setTime($h, $m, $s);
    }
}
