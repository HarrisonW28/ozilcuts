<?php

namespace App\Services\Availability;

use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use Illuminate\Support\Facades\DB;

final class BarberAvailabilityService
{
    /**
     * @return list<array{weekday: int, windows: list<array{starts_at: string, ends_at: string}>}>
     */
    public function groupedForProfile(BarberProfile $profile): array
    {
        $rows = $profile->availabilityWindows()
            ->orderBy('weekday')
            ->orderBy('starts_at')
            ->get(['weekday', 'starts_at', 'ends_at']);

        /** @var array<int, list<array{starts_at: string, ends_at: string}>> $byDay */
        $byDay = [];
        foreach ($rows as $row) {
            $day = (int) $row->weekday;
            if (! isset($byDay[$day])) {
                $byDay[$day] = [];
            }
            $byDay[$day][] = [
                'starts_at' => $this->formatTimeForApi((string) $row->starts_at),
                'ends_at' => $this->formatTimeForApi((string) $row->ends_at),
            ];
        }

        $out = [];
        ksort($byDay);
        foreach ($byDay as $weekday => $windows) {
            $out[] = ['weekday' => $weekday, 'windows' => $windows];
        }

        return $out;
    }

    /**
     * Group flat weekday rows (same shape as replace()) into API weekdays payload.
     *
     * @param  list<array{weekday?: int, starts_at?: string, ends_at?: string}>  $flat
     * @return list<array{weekday: int, windows: list<array{starts_at: string, ends_at: string}>}>
     */
    public function groupedFromFlatWindows(array $flat): array
    {
        if ($flat === []) {
            return [];
        }

        /** @var array<int, list<array{starts_at: string, ends_at: string}>> $byDay */
        $byDay = [];
        foreach ($flat as $row) {
            if (! is_array($row)) {
                continue;
            }
            $day = (int) ($row['weekday'] ?? -1);
            if ($day < 0 || $day > 6) {
                continue;
            }
            $starts = (string) ($row['starts_at'] ?? '');
            $ends = (string) ($row['ends_at'] ?? '');
            if ($starts === '' || $ends === '') {
                continue;
            }
            if (! isset($byDay[$day])) {
                $byDay[$day] = [];
            }
            $byDay[$day][] = [
                'starts_at' => $this->formatTimeForApi($starts),
                'ends_at' => $this->formatTimeForApi($ends),
            ];
        }

        ksort($byDay);

        $out = [];
        foreach ($byDay as $weekday => $windows) {
            usort(
                $windows,
                fn (array $a, array $b): int => strcmp((string) $a['starts_at'], (string) $b['starts_at']),
            );
            $out[] = ['weekday' => $weekday, 'windows' => $windows];
        }

        return $out;
    }

    /**
     * @param  list<array{weekday: int, starts_at: string, ends_at: string}>  $windows
     */
    public function replace(BarberProfile $profile, array $windows): void
    {
        DB::transaction(function () use ($profile, $windows): void {
            BarberAvailabilityWindow::query()
                ->where('barber_profile_id', $profile->id)
                ->delete();

            foreach ($windows as $w) {
                BarberAvailabilityWindow::query()->create([
                    'barber_profile_id' => $profile->id,
                    'weekday' => $w['weekday'],
                    'starts_at' => $this->normalizeTimeForDb($w['starts_at']),
                    'ends_at' => $this->normalizeTimeForDb($w['ends_at']),
                ]);
            }
        });
    }

    private function formatTimeForApi(string $sqlTime): string
    {
        return strlen($sqlTime) >= 5 ? substr($sqlTime, 0, 5) : $sqlTime;
    }

    private function normalizeTimeForDb(string $time): string
    {
        $parts = explode(':', $time);
        $h = str_pad((string) ((int) ($parts[0] ?? 0)), 2, '0', STR_PAD_LEFT);
        $m = str_pad((string) ((int) ($parts[1] ?? 0)), 2, '0', STR_PAD_LEFT);
        $s = isset($parts[2]) ? str_pad((string) ((int) $parts[2]), 2, '0', STR_PAD_LEFT) : '00';

        return "{$h}:{$m}:{$s}";
    }
}
