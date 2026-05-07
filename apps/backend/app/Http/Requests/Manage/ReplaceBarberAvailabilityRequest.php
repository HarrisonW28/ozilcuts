<?php

namespace App\Http\Requests\Manage;

use App\Models\BarberProfile;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Collection;
use Illuminate\Validation\Validator;

class ReplaceBarberAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->route('user');

        if (! $user instanceof User) {
            return false;
        }

        $profile = $user->barberProfile;

        return $profile instanceof BarberProfile
            && $this->user() !== null
            && $this->user()->can('update', $profile);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'windows' => ['present', 'array'],
            'windows.*.weekday' => ['required', 'integer', 'between:0,6'],
            'windows.*.starts_at' => ['required', 'string', 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/'],
            'windows.*.ends_at' => ['required', 'string', 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var list<array{weekday?: mixed, starts_at?: string, ends_at?: string}>|null $windows */
            $windows = $this->input('windows');
            if (! is_array($windows)) {
                return;
            }

            $collection = Collection::make($windows)->filter(fn ($w) => is_array($w));

            $byDay = $collection->groupBy(fn (array $w) => (int) ($w['weekday'] ?? -1));

            foreach ($byDay as $day => $dayWindows) {
                if ($day < 0 || $day > 6) {
                    continue;
                }
                /** @var Collection<int, array{starts_at?: string, ends_at?: string}> $dayWindows */
                $sorted = $dayWindows->sortBy(fn (array $w) => $this->secondsFromTime((string) ($w['starts_at'] ?? '00:00')));

                $prevEnd = null;
                foreach ($sorted as $w) {
                    $startS = (string) ($w['starts_at'] ?? '');
                    $endS = (string) ($w['ends_at'] ?? '');
                    if ($startS === '' || $endS === '') {
                        continue;
                    }
                    $start = $this->secondsFromTime($startS);
                    $end = $this->secondsFromTime($endS);
                    if ($end <= $start) {
                        $validator->errors()->add(
                            'windows',
                            'Each window must end after it starts.',
                        );

                        return;
                    }
                    if ($prevEnd !== null && $start < $prevEnd) {
                        $validator->errors()->add(
                            'windows',
                            'Availability windows cannot overlap on the same day.',
                        );

                        return;
                    }
                    $prevEnd = $end;
                }
            }
        });
    }

    private function secondsFromTime(string $time): int
    {
        $parts = explode(':', $time);
        $h = (int) ($parts[0] ?? 0);
        $m = (int) ($parts[1] ?? 0);
        $s = isset($parts[2]) ? (int) $parts[2] : 0;

        return $h * 3600 + $m * 60 + $s;
    }
}
