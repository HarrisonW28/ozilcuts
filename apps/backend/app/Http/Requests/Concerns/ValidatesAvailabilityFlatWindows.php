<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Support\Collection;
use Illuminate\Validation\Validator;

trait ValidatesAvailabilityFlatWindows
{
    /**
     * Rules for a flat list of windows: weekday + starts_at + ends_at per row.
     *
     * @return array<string, mixed>
     */
    protected function availabilityFlatWindowItemRules(string $prefix): array
    {
        return [
            "{$prefix}.*.weekday" => ['required', 'integer', 'between:0,6'],
            "{$prefix}.*.starts_at" => ['required', 'string', 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/'],
            "{$prefix}.*.ends_at" => ['required', 'string', 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/'],
        ];
    }

    /**
     * @param  list<mixed>|null  $windows
     */
    protected function validateAvailabilityFlatWindowsNotOverlapping(
        Validator $validator,
        string $errorKey,
        ?array $windows,
    ): void {
        if ($windows === null || $windows === []) {
            return;
        }

        $collection = Collection::make($windows)->filter(fn ($w) => is_array($w));

        $byDay = $collection->groupBy(fn (array $w) => (int) ($w['weekday'] ?? -1));

        foreach ($byDay as $day => $dayWindows) {
            if ($day < 0 || $day > 6) {
                continue;
            }
            /** @var Collection<int, array{starts_at?: string, ends_at?: string}> $dayWindows */
            $sorted = $dayWindows->sortBy(fn (array $w) => $this->availabilitySecondsFromTime((string) ($w['starts_at'] ?? '00:00')));

            $prevEnd = null;
            foreach ($sorted as $w) {
                $startS = (string) ($w['starts_at'] ?? '');
                $endS = (string) ($w['ends_at'] ?? '');
                if ($startS === '' || $endS === '') {
                    continue;
                }
                $start = $this->availabilitySecondsFromTime($startS);
                $end = $this->availabilitySecondsFromTime($endS);
                if ($end <= $start) {
                    $validator->errors()->add(
                        $errorKey,
                        'Each window must end after it starts.',
                    );

                    return;
                }
                if ($prevEnd !== null && $start < $prevEnd) {
                    $validator->errors()->add(
                        $errorKey,
                        'Availability windows cannot overlap on the same day.',
                    );

                    return;
                }
                $prevEnd = $end;
            }
        }
    }

    private function availabilitySecondsFromTime(string $time): int
    {
        $parts = explode(':', $time);
        $h = (int) ($parts[0] ?? 0);
        $m = (int) ($parts[1] ?? 0);
        $s = isset($parts[2]) ? (int) $parts[2] : 0;

        return $h * 3600 + $m * 60 + $s;
    }
}
