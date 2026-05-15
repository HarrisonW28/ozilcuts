<?php

namespace App\Services\Appointments;

use App\Models\Appointment;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Same-day queue snapshot for one appointment — calm estimates, no PII in
 * responses beyond what the viewer already sees on their booking.
 */
final class QueueWaitIntelligenceService
{
    private const GRACE_BEHIND_MS = 7 * 60 * 1000;

    private const MAX_ESTIMATE_MINUTES = 240;

    /**
     * @return array{
     *     queue_date: string,
     *     estimated_chair_minutes_ahead: int|null,
     *     guests_ahead_in_arrival: int,
     *     lounge_guests_other: int,
     *     chair_in_use: bool,
     *     visits_behind_schedule: int,
     *     headline: string,
     *     is_next_in_line: bool,
     *     pace_tone: string,
     *     updated_at: string,
     * }
     */
    public function summarize(
        Appointment $focal,
        ?int $nowMs = null,
        bool $staffViewer = false,
    ): array {
        $focal->loadMissing(['service', 'barber']);
        $nowMs ??= (int) (CarbonImmutable::now()->getTimestamp() * 1000);
        $now = CarbonImmutable::now();

        $startsAt = $focal->starts_at;
        if ($startsAt === null) {
            return $this->emptyPayload($now->toDateString());
        }

        $queueDate = $startsAt->toDateString();

        $dayStart = $startsAt->copy()->startOfDay();
        $dayEnd = $startsAt->copy()->endOfDay();

        $queue = Appointment::query()
            ->where('barber_user_id', $focal->barber_user_id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [$dayStart, $dayEnd])
            ->with(['service'])
            ->orderBy('starts_at')
            ->get();

        if ($queue->isEmpty()) {
            return $this->emptyPayload($queueDate);
        }

        $idx = $queue->search(fn (Appointment $a) => (int) $a->id === (int) $focal->id);
        if ($idx === false) {
            return $this->emptyPayload($queueDate);
        }

        $est = $this->estimateMinutesAheadInQueue($queue, (int) $focal->id, $nowMs);
        $guestsAhead = $this->countWaitingAhead($queue, (int) $focal->id, $nowMs);
        $loungeOther = $this->countLoungeGuestsExcluding($queue, (int) $focal->id);
        $chairInUse = $this->findServingAppointment($queue, $nowMs) !== null;
        $behind = $this->countBehindSchedule($queue, $nowMs);

        $headline = $this->buildHeadline(
            (string) $focal->arrival_state,
            $est,
            $guestsAhead,
            $loungeOther,
            $chairInUse,
            $behind,
            $staffViewer,
        );

        $isNext = $guestsAhead <= 0 && in_array(
            (string) $focal->arrival_state,
            [Appointment::ARRIVAL_WAITING, Appointment::ARRIVAL_ARRIVED],
            true,
        );

        return [
            'queue_date' => $queueDate,
            'estimated_chair_minutes_ahead' => $est,
            'guests_ahead_in_arrival' => $guestsAhead,
            'lounge_guests_other' => $loungeOther,
            'chair_in_use' => $chairInUse,
            'visits_behind_schedule' => $behind,
            'headline' => $headline,
            'is_next_in_line' => $isNext,
            'pace_tone' => $behind > 0 ? 'behind' : 'calm',
            'updated_at' => $now->toIso8601String(),
        ];
    }

    /**
     * @param  Collection<int, Appointment>  $queue
     */
    private function emptyPayload(string $queueDate): array
    {
        return [
            'queue_date' => $queueDate,
            'estimated_chair_minutes_ahead' => null,
            'guests_ahead_in_arrival' => 0,
            'lounge_guests_other' => 0,
            'chair_in_use' => false,
            'visits_behind_schedule' => 0,
            'headline' => 'We will keep this page updated as your visit moves along.',
            'is_next_in_line' => false,
            'pace_tone' => 'calm',
            'updated_at' => CarbonImmutable::now()->toIso8601String(),
        ];
    }

    private function buildHeadline(
        string $arrivalState,
        ?int $est,
        int $guestsAhead,
        int $loungeOther,
        bool $chairInUse,
        int $behind,
        bool $staffViewer,
    ): string {
        $delay = $behind > 0
            ? ' The day is running a little behind — thanks for your patience.'
            : '';

        if ($arrivalState === Appointment::ARRIVAL_WAITING) {
            if ($guestsAhead <= 0 && ($est === null || $est <= 10)) {
                return $staffViewer
                    ? 'Your guest is next in line for the chair. Seat them when you are ready.'
                    : 'You are next in line for the chair. Sit tight — your barber will seat you soon.'.$delay;
            }
            if ($guestsAhead <= 0 && $est !== null) {
                return $staffViewer
                    ? sprintf(
                        'Your guest is next in line. Roughly %d minutes of visits are still ahead — no rush.',
                        $est,
                    )
                    : sprintf(
                        'You are next in line. We estimate about %d minutes of visits ahead — no rush.',
                        $est,
                    ).$delay;
            }
            if ($est !== null) {
                $guestWord = $guestsAhead === 1 ? 'one guest' : sprintf('%d guests', $guestsAhead);

                return sprintf(
                    'About %s ahead in today\'s visit order, with roughly %d minutes of chair time before this visit. Relax nearby.',
                    $guestWord,
                    $est,
                ).($staffViewer ? '' : $delay);
            }

            return sprintf(
                'About %s ahead in today\'s visit order. Move everyone along calmly when it feels right.',
                $guestsAhead === 1 ? 'one guest is' : sprintf('%d guests are', $guestsAhead),
            ).($staffViewer ? '' : $delay);
        }

        if ($arrivalState === Appointment::ARRIVAL_ARRIVED) {
            if ($loungeOther === 0) {
                return $staffViewer
                    ? 'Your guest is checked in. Seat them when the chair opens.'
                    : 'You are checked in. When the chair opens, your barber will seat you.'.$delay;
            }
            if ($loungeOther === 1) {
                return $staffViewer
                    ? 'Your guest is checked in. One other guest is also here — take visits in turn.'
                    : 'You are checked in. One other guest is also here — we will take everyone in turn.'.$delay;
            }

            return $staffViewer
                ? 'Your guest is checked in. A few other guests are here — keep the flow steady and unhurried.'
                : 'You are checked in. A few other guests are here too — we will keep the flow steady and unhurried.'.$delay;
        }

        if ($arrivalState === Appointment::ARRIVAL_EXPECTED) {
            if ($behind > 0) {
                return $staffViewer
                    ? 'Today is moving a touch behind schedule — let your guest know they can arrive at their ease.'
                    : 'Today is moving a touch behind schedule. Arrive at your ease — we will catch up gently.';
            }
            if ($chairInUse) {
                return $staffViewer
                    ? 'The chair is busy. This visit is still reserved — your guest can check in when they arrive.'
                    : 'The chair is busy with another visit. Your spot is reserved — check in when you arrive.';
            }

            return $staffViewer
                ? 'This visit is on the calendar. Your guest can check in when they reach the shop.'
                : 'Your visit is on the calendar. Check in when you reach the shop — we will guide you from there.';
        }

        return $staffViewer
            ? 'Your guest is in the chair.'
            : 'Enjoy your time in the chair.';
    }

    /**
     * @param  Collection<int, Appointment>  $queue
     */
    private function countBehindSchedule(Collection $queue, int $nowMs): int
    {
        $n = 0;
        foreach ($queue as $a) {
            if ($this->deriveOperationalStatus($a, $nowMs) === 'behind_schedule') {
                $n++;
            }
        }

        return $n;
    }

    /**
     * @param  Collection<int, Appointment>  $queue
     */
    private function countLoungeGuestsExcluding(
        Collection $queue,
        int $excludeId,
    ): int {
        $n = 0;
        foreach ($queue as $a) {
            if ((int) $a->id === $excludeId) {
                continue;
            }
            $s = (string) $a->arrival_state;
            if ($s === Appointment::ARRIVAL_ARRIVED || $s === Appointment::ARRIVAL_WAITING) {
                $n++;
            }
        }

        return $n;
    }

    /**
     * @param  Collection<int, Appointment>  $queue
     */
    private function findServingAppointment(
        Collection $queue,
        int $nowMs,
    ): ?Appointment {
        foreach ($queue as $a) {
            if ((string) $a->arrival_state === Appointment::ARRIVAL_IN_CHAIR) {
                return $a;
            }
            $st = $this->startMs($a);
            $en = $this->endMs($a);
            if ($st !== null && $en !== null && $nowMs >= $st && $nowMs < $en) {
                return $a;
            }
        }

        return null;
    }

    /**
     * @param  Collection<int, Appointment>  $queue
     */
    private function estimateMinutesAheadInQueue(
        Collection $queue,
        int $targetId,
        int $nowMs,
    ): ?int {
        $idx = $queue->search(fn (Appointment $a) => (int) $a->id === $targetId);
        if ($idx === false || $idx <= 0) {
            return null;
        }
        $minutes = 0;
        for ($j = 0; $j < $idx; $j++) {
            $a = $queue->get($j);
            if ($a === null) {
                continue;
            }
            $end = $this->endMs($a);
            $st = $this->startMs($a);
            if ($end === null || $st === null) {
                continue;
            }
            if ($end <= $nowMs) {
                continue;
            }
            $dur = $a->service !== null ? (int) $a->service->duration_minutes : 30;
            if ($nowMs < $st) {
                $minutes += $dur;
            } else {
                $minutes += max(1, (int) ceil(($end - $nowMs) / 60_000));
            }
        }

        if ($minutes <= 0) {
            return null;
        }

        return min(self::MAX_ESTIMATE_MINUTES, $minutes);
    }

    /**
     * @param  Collection<int, Appointment>  $queue
     */
    private function countWaitingAhead(
        Collection $queue,
        int $targetId,
        int $nowMs,
    ): int {
        $idx = $queue->search(fn (Appointment $a) => (int) $a->id === $targetId);
        if ($idx === false || $idx <= 0) {
            return 0;
        }
        $n = 0;
        for ($j = 0; $j < $idx; $j++) {
            $a = $queue->get($j);
            if ($a === null) {
                continue;
            }
            $s = $this->deriveOperationalStatus($a, $nowMs);
            if (in_array($s, ['checked_in', 'waiting_room', 'on_deck', 'behind_schedule'], true)) {
                $n++;
            }
        }

        return $n;
    }

    private function deriveOperationalStatus(Appointment $appointment, int $nowMs): string
    {
        if ($appointment->status === Appointment::STATUS_CANCELLED) {
            return 'cancelled';
        }

        $end = $this->endMs($appointment);
        $start = $this->startMs($appointment);
        if ($end !== null && $nowMs >= $end) {
            return 'wrapped_up';
        }

        $arrival = (string) $appointment->arrival_state;

        if ($arrival === Appointment::ARRIVAL_IN_CHAIR) {
            return 'in_service';
        }
        if ($arrival === Appointment::ARRIVAL_WAITING) {
            return 'waiting_room';
        }
        if ($arrival === Appointment::ARRIVAL_ARRIVED) {
            return 'checked_in';
        }

        if ($start !== null && $nowMs >= $start && $nowMs < $start + self::GRACE_BEHIND_MS) {
            return 'on_deck';
        }

        if (
            $start !== null
            && $end !== null
            && $nowMs > $start + self::GRACE_BEHIND_MS
            && $nowMs < $end
            && $arrival === Appointment::ARRIVAL_EXPECTED
        ) {
            return 'behind_schedule';
        }

        if (
            $start !== null
            && $end !== null
            && $nowMs >= $start
            && $nowMs < $end
            && $arrival === Appointment::ARRIVAL_EXPECTED
        ) {
            return 'in_service';
        }

        return 'scheduled';
    }

    private function endMs(Appointment $a): ?int
    {
        if ($a->ends_at !== null) {
            return $this->carbonToEpochMs($a->ends_at);
        }
        if ($a->starts_at === null) {
            return null;
        }
        $start = $this->carbonToEpochMs($a->starts_at);
        $dur = ($a->service !== null ? (int) $a->service->duration_minutes : 30) * 60_000;

        return $start + $dur;
    }

    private function startMs(Appointment $a): ?int
    {
        if ($a->starts_at === null) {
            return null;
        }

        return $this->carbonToEpochMs($a->starts_at);
    }

    private function carbonToEpochMs(CarbonInterface $dt): int
    {
        return (int) ($dt->getTimestamp() * 1000);
    }
}
