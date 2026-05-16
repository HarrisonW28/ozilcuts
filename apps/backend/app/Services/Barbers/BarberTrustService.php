<?php

namespace App\Services\Barbers;

use App\Models\Appointment;
use App\Models\AppointmentReview;
use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\HaircutPhoto;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Public trust snapshot for booking confidence: verified reviews, repeat
 * guests, consistency signals, specialties, and portfolio proof.
 */
final class BarberTrustService
{
    private const REVIEW_PREVIEW_LIMIT = 6;

    private const SPECIALTY_INFER_LIMIT = 5;

    private const RECENT_PORTFOLIO_DAYS = 90;

    private const MIN_APPOINTMENTS_FOR_CANCELLATION_SIGNAL = 5;

    /**
     * @return array<string, mixed>
     */
    public function forBarber(User $barber, CarbonImmutable $now): array
    {
        $barberUserId = (int) $barber->id;
        $profile = BarberProfile::query()
            ->where('user_id', $barberUserId)
            ->first();

        $repeat = $this->repeatMetrics($barberUserId, $now);
        $reviews = $this->publishedReviews($barberUserId);
        $reviewCount = $this->totalReviewCount($barberUserId);
        $avgRating = $this->averageRating($barberUserId);
        $portfolio = $this->portfolioSignals($barberUserId, $now);
        $specialties = $this->resolveSpecialties($profile, $barberUserId);
        $consistency = $this->consistencyIndicators($barberUserId, $profile, $now);

        return [
            'barber_user_id' => $barberUserId,
            'average_rating' => $avgRating,
            'review_count' => $reviewCount,
            'repeat_metrics' => $repeat,
            'consistency' => $consistency,
            'specialties' => $specialties['labels'],
            'specialties_source' => $specialties['source'],
            'portfolio' => $portfolio,
            'reviews' => $reviews,
            'highlights' => $this->buildHighlights(
                $avgRating,
                $reviewCount,
                $repeat,
                $portfolio,
                $consistency,
            ),
        ];
    }

    /**
     * @return array{
     *     unique_customers: int,
     *     repeat_customers: int,
     *     repeat_rate: float,
     *     verified_visits: int,
     * }
     */
    private function repeatMetrics(int $barberUserId, CarbonImmutable $now): array
    {
        $verifiedVisits = (int) Appointment::query()
            ->where('barber_user_id', $barberUserId)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<', $now)
            ->count();

        $customerCounts = Appointment::query()
            ->select('customer_user_id', DB::raw('COUNT(*) as visit_count'))
            ->where('barber_user_id', $barberUserId)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<', $now)
            ->groupBy('customer_user_id')
            ->get();

        $unique = $customerCounts->count();
        $repeat = $customerCounts->filter(fn ($row) => (int) $row->visit_count >= 2)->count();
        $rate = $unique > 0 ? round($repeat / $unique, 4) : 0.0;

        return [
            'unique_customers' => $unique,
            'repeat_customers' => $repeat,
            'repeat_rate' => $rate,
            'verified_visits' => $verifiedVisits,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function publishedReviews(int $barberUserId): array
    {
        $rows = AppointmentReview::query()
            ->where('barber_user_id', $barberUserId)
            ->where('is_published', true)
            ->whereNotNull('verified_at')
            ->with(['customer', 'appointment.service'])
            ->orderByDesc('created_at')
            ->limit(self::REVIEW_PREVIEW_LIMIT)
            ->get();

        $out = [];
        foreach ($rows as $review) {
            $customer = $review->customer;
            $appointment = $review->appointment;
            $out[] = [
                'id' => $review->id,
                'rating' => (int) $review->rating,
                'body' => (string) $review->body,
                'customer_display_name' => $customer !== null
                    ? $this->displayName($customer->name)
                    : 'Guest',
                'service_name' => $appointment?->service?->name,
                'visited_at' => $appointment?->starts_at?->toIso8601String(),
                'verified' => true,
            ];
        }

        return $out;
    }

    private function totalReviewCount(int $barberUserId): int
    {
        return (int) AppointmentReview::query()
            ->where('barber_user_id', $barberUserId)
            ->where('is_published', true)
            ->whereNotNull('verified_at')
            ->count();
    }

    private function averageRating(int $barberUserId): ?float
    {
        $avg = AppointmentReview::query()
            ->where('barber_user_id', $barberUserId)
            ->where('is_published', true)
            ->whereNotNull('verified_at')
            ->avg('rating');

        return $avg !== null ? round((float) $avg, 2) : null;
    }

    /**
     * @return array{
     *     public_photo_count: int,
     *     before_after_pair_count: int,
     *     has_recent_work: bool,
     *     guest_consent_photos: bool,
     * }
     */
    private function portfolioSignals(int $barberUserId, CarbonImmutable $now): array
    {
        $base = HaircutPhoto::query()
            ->publiclyVisible()
            ->whereHas(
                'appointment',
                fn ($q) => $q->where('barber_user_id', $barberUserId),
            );

        $publicCount = (int) (clone $base)->count();

        $recentCutoff = $now->subDays(self::RECENT_PORTFOLIO_DAYS);
        $hasRecent = (clone $base)
            ->where('created_at', '>=', $recentCutoff)
            ->exists();

        $kindsByAppointment = DB::table('haircut_photos as hp')
            ->join('appointments as a', 'a.id', '=', 'hp.appointment_id')
            ->where('a.barber_user_id', $barberUserId)
            ->where('hp.is_public', true)
            ->where('hp.customer_consent', true)
            ->select('hp.appointment_id', 'hp.kind')
            ->get()
            ->groupBy('appointment_id');

        $beforeAfterPairs = $kindsByAppointment->filter(function ($rows): bool {
            $kinds = $rows->pluck('kind')->unique();

            return $kinds->contains(HaircutPhoto::KIND_BEFORE)
                && $kinds->contains(HaircutPhoto::KIND_AFTER);
        })->count();

        return [
            'public_photo_count' => $publicCount,
            'before_after_pair_count' => $beforeAfterPairs,
            'has_recent_work' => $hasRecent,
            'guest_consent_photos' => $publicCount > 0,
        ];
    }

    /**
     * @return array{labels: list<string>, source: 'profile'|'inferred'}
     */
    private function resolveSpecialties(?BarberProfile $profile, int $barberUserId): array
    {
        $fromProfile = $profile?->specialties;
        if (is_array($fromProfile) && $fromProfile !== []) {
            $labels = array_values(array_filter(array_map(
                fn ($s) => is_string($s) ? trim($s) : '',
                $fromProfile,
            )));

            if ($labels !== []) {
                return [
                    'labels' => array_slice($labels, 0, self::SPECIALTY_INFER_LIMIT),
                    'source' => 'profile',
                ];
            }
        }

        $rows = Appointment::query()
            ->join('services', 'services.id', '=', 'appointments.service_id')
            ->where('appointments.barber_user_id', $barberUserId)
            ->where('appointments.status', Appointment::STATUS_CONFIRMED)
            ->groupBy('services.name')
            ->orderByDesc(DB::raw('COUNT(*)'))
            ->limit(self::SPECIALTY_INFER_LIMIT)
            ->pluck('services.name');

        return [
            'labels' => $rows->map(fn ($n) => (string) $n)->all(),
            'source' => 'inferred',
        ];
    }

    /**
     * @return list<array{
     *     key: string,
     *     label: string,
     *     value_label: string,
     *     level: string,
     *     description: string,
     * }>
     */
    private function consistencyIndicators(
        int $barberUserId,
        ?BarberProfile $profile,
        CarbonImmutable $now,
    ): array {
        $indicators = [];

        $total = (int) Appointment::query()
            ->where('barber_user_id', $barberUserId)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<', $now)
            ->whereIn('status', [Appointment::STATUS_CONFIRMED, Appointment::STATUS_CANCELLED])
            ->count();

        $cancelled = (int) Appointment::query()
            ->where('barber_user_id', $barberUserId)
            ->where('status', Appointment::STATUS_CANCELLED)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<', $now)
            ->count();

        if ($total >= self::MIN_APPOINTMENTS_FOR_CANCELLATION_SIGNAL) {
            $cancelRate = $cancelled / max(1, $total);
            $reliabilityPct = (int) round((1 - $cancelRate) * 100);
            $level = $reliabilityPct >= 92 ? 'strong' : ($reliabilityPct >= 82 ? 'good' : 'building');

            $indicators[] = [
                'key' => 'reliability',
                'label' => 'Booking reliability',
                'value_label' => "{$reliabilityPct}% kept",
                'level' => $level,
                'description' => 'Share of past appointments that were not cancelled.',
            ];
        }

        $pastConfirmed = (int) Appointment::query()
            ->where('barber_user_id', $barberUserId)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereNotNull('starts_at')
            ->where('starts_at', '<', $now)
            ->count();

        if ($pastConfirmed >= 3) {
            $checkedIn = (int) Appointment::query()
                ->where('barber_user_id', $barberUserId)
                ->where('status', Appointment::STATUS_CONFIRMED)
                ->whereNotNull('starts_at')
                ->where('starts_at', '<', $now)
                ->whereIn('arrival_state', [
                    Appointment::ARRIVAL_ARRIVED,
                    Appointment::ARRIVAL_WAITING,
                    Appointment::ARRIVAL_IN_CHAIR,
                ])
                ->count();

            $pct = (int) round(($checkedIn / $pastConfirmed) * 100);
            $level = $pct >= 75 ? 'strong' : ($pct >= 50 ? 'good' : 'building');

            $indicators[] = [
                'key' => 'visit_flow',
                'label' => 'Visit consistency',
                'value_label' => "{$pct}% check-ins",
                'level' => $level,
                'description' => 'Guests who completed the on-site arrival flow for past visits.',
            ];
        }

        $hasSchedule = $profile !== null && BarberAvailabilityWindow::query()
            ->where('barber_profile_id', $profile->id)
            ->exists();

        $indicators[] = [
            'key' => 'schedule',
            'label' => 'Published hours',
            'value_label' => $hasSchedule ? 'On file' : 'Updating',
            'level' => $hasSchedule ? 'strong' : 'building',
            'description' => $hasSchedule
                ? 'Weekly availability is published so you know when to book.'
                : 'Hours are still being finalized for this barber.',
        ];

        return $indicators;
    }

    /**
     * @param  array{
     *     unique_customers: int,
     *     repeat_customers: int,
     *     repeat_rate: float,
     *     verified_visits: int,
     * }  $repeat
     * @param  array{
     *     public_photo_count: int,
     *     before_after_pair_count: int,
     *     has_recent_work: bool,
     *     guest_consent_photos: bool,
     * }  $portfolio
     * @param  list<array<string, mixed>>  $consistency
     * @return list<string>
     */
    private function buildHighlights(
        ?float $avgRating,
        int $reviewCount,
        array $repeat,
        array $portfolio,
        array $consistency,
    ): array {
        $highlights = [];

        if ($avgRating !== null && $reviewCount > 0) {
            $highlights[] = sprintf(
                '%.1f average from %d verified review%s',
                $avgRating,
                $reviewCount,
                $reviewCount === 1 ? '' : 's',
            );
        } elseif ($repeat['verified_visits'] >= 10) {
            $highlights[] = sprintf(
                '%d completed visits on record',
                $repeat['verified_visits'],
            );
        }

        if ($repeat['repeat_rate'] >= 0.35 && $repeat['repeat_customers'] >= 2) {
            $pct = (int) round($repeat['repeat_rate'] * 100);
            $highlights[] = "{$pct}% of guests book again";
        }

        if ($portfolio['before_after_pair_count'] >= 1) {
            $highlights[] = 'Before & after work with guest consent';
        } elseif ($portfolio['public_photo_count'] >= 3) {
            $highlights[] = 'Portfolio backed by real guest photos';
        }

        foreach ($consistency as $indicator) {
            if (($indicator['level'] ?? '') === 'strong' && count($highlights) < 4) {
                $highlights[] = ($indicator['label'] ?? 'Consistency').': '.($indicator['value_label'] ?? '');
            }
        }

        return array_slice(array_values(array_unique($highlights)), 0, 4);
    }

    private function displayName(string $fullName): string
    {
        $parts = preg_split('/\s+/', trim($fullName)) ?: [];
        if ($parts === []) {
            return 'Guest';
        }
        $first = $parts[0];
        if (count($parts) === 1) {
            return $first;
        }

        $lastInitial = mb_substr($parts[count($parts) - 1], 0, 1);

        return "{$first} {$lastInitial}.";
    }
}
