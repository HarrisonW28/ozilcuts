<?php

namespace App\Services\Customers;

use App\Models\Appointment;
use App\Models\CustomerNote;
use App\Models\CustomerProfile;
use App\Models\CustomerTag;
use App\Models\Role;
use App\Models\User;
use App\Services\Reports\CustomerAnalyticsService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Relationship CRM snapshot for personalization: birthdays, visit milestones,
 * loyalty history, VIP status, and relationship notes.
 */
final class CustomerRelationshipService
{
    /** @var list<int> */
    public const VISIT_MILESTONES = [3, 6, 10, 15, 25];

    private const BIRTHDAY_SOON_DAYS = 14;

    public function __construct(
        private readonly CustomerAnalyticsService $analytics,
        private readonly CustomerNoteService $notes,
        private readonly CustomerTagService $tags,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function forCustomer(User $customer, CarbonImmutable $now, bool $staffView): array
    {
        $customer->loadMissing(['role', 'customerProfile']);
        $profile = $customer->customerProfile;
        $summary = $this->analytics->forCustomer($customer);
        $totalVisits = (int) ($summary['total_visits'] ?? 0);

        $tags = $this->tags->listFor($customer);
        $isVip = $this->tags->isVip($customer);
        $allNotes = $this->notes->listFor($customer);

        return [
            'customer_user_id' => (int) $customer->id,
            'customer_name' => (string) $customer->name,
            'is_vip' => $isVip,
            'birthday' => $this->birthdayBlock($profile, $now),
            'milestones' => $this->milestones($totalVisits),
            'loyalty_history' => $this->loyaltyHistory($customer, $totalVisits, $now),
            'relationship_notes' => $this->relationshipNotesPreview($allNotes, $staffView),
            'visit_summary' => [
                'total_visits' => $totalVisits,
                'last_visit_at' => $summary['last_visit_at'] ?? null,
                'first_visit_at' => $summary['first_visit_at'] ?? null,
            ],
            'tags' => $tags->map(fn (CustomerTag $t) => [
                'id' => $t->id,
                'label' => $t->label,
                'is_vip' => CustomerTag::isVipLabel($t->label),
            ])->values()->all(),
        ];
    }

    public function setVip(User $customer, User $actor, bool $vip): void
    {
        $this->tags->setVip($customer, $actor, $vip);
    }

    /**
     * @return array<string, mixed>
     */
    private function birthdayBlock(?CustomerProfile $profile, CarbonImmutable $now): array
    {
        if ($profile === null || $profile->date_of_birth === null) {
            return [
                'has_date' => false,
                'display' => null,
                'month' => null,
                'day' => null,
                'days_until' => null,
                'is_today' => false,
                'is_soon' => false,
            ];
        }

        $dob = CarbonImmutable::parse((string) $profile->date_of_birth);
        $thisYear = $this->nextBirthdayOccurrence($dob, $now);
        $daysUntil = (int) $now->startOfDay()->diffInDays($thisYear, false);

        return [
            'has_date' => true,
            'display' => $dob->format('F j'),
            'month' => (int) $dob->month,
            'day' => (int) $dob->day,
            'days_until' => $daysUntil,
            'is_today' => $daysUntil === 0,
            'is_soon' => $daysUntil > 0 && $daysUntil <= self::BIRTHDAY_SOON_DAYS,
        ];
    }

    private function nextBirthdayOccurrence(CarbonImmutable $dob, CarbonImmutable $now): CarbonImmutable
    {
        $candidate = $now->setDate($now->year, $dob->month, $dob->day)->startOfDay();
        if ($candidate->lessThan($now->startOfDay())) {
            $candidate = $candidate->addYear();
        }

        return $candidate;
    }

    /**
     * @return array{
     *     next: array{visit_count: int, label: string}|null,
     *     achieved: list<array{visit_count: int, label: string}>,
     * }
     */
    private function milestones(int $totalVisits): array
    {
        $achieved = [];
        foreach (self::VISIT_MILESTONES as $m) {
            if ($totalVisits >= $m) {
                $achieved[] = [
                    'visit_count' => $m,
                    'label' => $this->milestoneLabel($m),
                ];
            }
        }

        $next = null;
        foreach (self::VISIT_MILESTONES as $m) {
            if ($totalVisits < $m) {
                $next = [
                    'visit_count' => $m,
                    'label' => $this->milestoneLabel($m),
                    'visits_remaining' => $m - $totalVisits,
                ];
                break;
            }
        }

        return [
            'achieved' => $achieved,
            'next' => $next,
        ];
    }

    private function milestoneLabel(int $m): string
    {
        return match ($m) {
            3 => 'Finding your rhythm',
            6 => 'Familiar face',
            10 => 'Studio regular',
            15 => 'Inner circle',
            25 => 'Studio legend',
            default => "{$m} visits",
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loyaltyHistory(User $customer, int $totalVisits, CarbonImmutable $now): array
    {
        $events = [];

        $visits = Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<', $now)
            ->with(['service'])
            ->orderByDesc('starts_at')
            ->limit(8)
            ->get();

        $visitNumber = $totalVisits;
        foreach ($visits as $appt) {
            $events[] = [
                'kind' => 'visit',
                'label' => $appt->service?->name ?? 'Visit',
                'occurred_at' => $appt->starts_at?->toIso8601String(),
                'visit_number' => $visitNumber,
            ];
            $visitNumber--;
        }

        foreach (array_reverse(self::VISIT_MILESTONES) as $m) {
            if ($totalVisits < $m) {
                continue;
            }
            $milestoneVisit = Appointment::query()
                ->where('customer_user_id', $customer->id)
                ->where('status', Appointment::STATUS_CONFIRMED)
                ->whereNotNull('starts_at')
                ->where('starts_at', '<', $now)
                ->orderBy('starts_at')
                ->skip($m - 1)
                ->first();

            $events[] = [
                'kind' => 'milestone',
                'label' => $this->milestoneLabel($m),
                'occurred_at' => $milestoneVisit?->starts_at?->toIso8601String(),
                'visit_count' => $m,
            ];
        }

        usort($events, function (array $a, array $b): int {
            $ta = $a['occurred_at'] ?? '';
            $tb = $b['occurred_at'] ?? '';

            return strcmp($tb, $ta);
        });

        return array_slice($events, 0, 12);
    }

    /**
     * @param  Collection<int, CustomerNote>  $notes
     * @return list<array<string, mixed>>
     */
    private function relationshipNotesPreview(Collection $notes, bool $staffView): array
    {
        $pinned = $notes->where('pinned', true)->take(3);
        $rest = $notes->where('pinned', false)->take($staffView ? 5 : 3);
        $combined = $pinned->concat($rest)->unique('id')->take(6);

        return $combined->map(function (CustomerNote $note) use ($staffView): array {
            $body = (string) $note->body;
            if (! $staffView && mb_strlen($body) > 120) {
                $body = mb_substr($body, 0, 120).'…';
            }

            return [
                'id' => $note->id,
                'body' => $body,
                'pinned' => (bool) $note->pinned,
                'author_name' => $note->author?->name,
                'created_at' => $note->created_at?->toIso8601String(),
            ];
        })->values()->all();
    }

    public function assertStaffViewer(User $viewer): void
    {
        if (! $viewer->hasRole(Role::SLUG_BARBER) && ! $viewer->isAdmin()) {
            abort(403);
        }
    }

    public function assertCustomer(User $user): void
    {
        if (! $user->hasRole(Role::SLUG_CUSTOMER)) {
            abort(404);
        }
    }
}
