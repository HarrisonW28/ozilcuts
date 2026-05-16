<?php

namespace App\Services\Abuse;

use App\Exceptions\AbuseBlockedException;
use App\Models\Appointment;
use App\Models\AppointmentMessage;
use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Conservative abuse, spam, and fraud guards for customer self-service flows.
 * Staff-assisted bookings and shop-side messaging are exempt.
 */
final class AbuseProtectionService
{
    public function enabled(): bool
    {
        return (bool) config('abuse.enabled', true);
    }

    public function isStaffExempt(User $user): bool
    {
        return $user->isAdmin() || $user->hasRole(Role::SLUG_BARBER);
    }

    public function assertRegistrationAttempt(Request $request): void
    {
        if (! $this->enabled()) {
            return;
        }

        $ip = (string) ($request->ip() ?? 'unknown');
        $day = CarbonImmutable::now()->format('Y-m-d');
        $key = "abuse:register:ip:{$ip}:{$day}";
        $max = max(3, (int) config('abuse.registration.max_per_ip_per_day', 12));

        $count = (int) Cache::get($key, 0);
        if ($count >= $max) {
            throw new AbuseBlockedException(
                'Too many accounts were created from this network today. Try again tomorrow or contact the shop.',
                'registration_rate_limit',
                3600,
            );
        }
    }

    public function recordRegistrationAttempt(Request $request): void
    {
        if (! $this->enabled()) {
            return;
        }

        $ip = (string) ($request->ip() ?? 'unknown');
        $day = CarbonImmutable::now()->format('Y-m-d');
        $key = "abuse:register:ip:{$ip}:{$day}";

        Cache::add($key, 0, now()->addDay());
        Cache::increment($key);
    }

    public function assertCustomerCanBook(
        User $customer,
        int $barberUserId,
        CarbonImmutable $startsAt,
    ): void {
        if (! $this->enabled() || $this->isStaffExempt($customer)) {
            return;
        }

        $maxFuture = max(3, (int) config('abuse.booking.max_future_confirmed', 6));
        $futureCount = Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('starts_at', '>', now()->toDateTimeString())
            ->count();

        if ($futureCount >= $maxFuture) {
            throw new AbuseBlockedException(
                'You already have several upcoming visits booked. Finish or cancel one before adding another.',
                'booking_future_limit',
            );
        }

        $maxHour = max(4, (int) config('abuse.booking.max_per_hour', 8));
        $hourKey = "abuse:bookings:hour:{$customer->id}";
        $hourCount = (int) Cache::get($hourKey, 0);
        if ($hourCount >= $maxHour) {
            throw new AbuseBlockedException(
                'You are booking visits quickly. Wait a few minutes, then try again.',
                'booking_rate_limit',
                60,
            );
        }

        if ((bool) config('abuse.fraud.block_unpaid_deposit_hoarding', true)) {
            $maxUnpaid = max(1, (int) config('abuse.booking.max_unpaid_deposits', 3));
            $unpaid = Appointment::query()
                ->where('customer_user_id', $customer->id)
                ->where('status', Appointment::STATUS_CONFIRMED)
                ->where('payment_status', Appointment::PAYMENT_REQUIRES_PAYMENT)
                ->where('starts_at', '>', now()->toDateTimeString())
                ->count();

            if ($unpaid >= $maxUnpaid) {
                throw new AbuseBlockedException(
                    'Complete payment on your existing bookings before reserving another slot.',
                    'unpaid_deposit_limit',
                );
            }
        }

        $slotKey = sprintf(
            'abuse:slot:%d:%d:%s',
            $customer->id,
            $barberUserId,
            $startsAt->format('Y-m-d H:i'),
        );
        $slotAttempts = (int) Cache::get($slotKey, 0);
        $maxSlotAttempts = max(10, (int) config('abuse.booking.max_slot_attempts_per_10_minutes', 20));
        if ($slotAttempts >= $maxSlotAttempts) {
            throw new AbuseBlockedException(
                'Too many attempts for this time. Pick another slot or try again in a few minutes.',
                'slot_attempt_limit',
                120,
            );
        }

        Cache::put($slotKey, $slotAttempts + 1, now()->addMinutes(10));
    }

    public function recordCustomerBooking(User $customer): void
    {
        if (! $this->enabled()) {
            return;
        }

        $hourKey = "abuse:bookings:hour:{$customer->id}";
        Cache::add($hourKey, 0, now()->addHour());
        Cache::increment($hourKey);

        $windowHours = max(1, (int) config('abuse.cancel.window_hours', 24));
        $windowKey = "abuse:bookings:window:{$customer->id}";
        Cache::add($windowKey, 0, now()->addHours($windowHours));
        Cache::increment($windowKey);

        $this->logSuspiciousSignals($customer, 'booking_recorded');
    }

    public function assertCustomerCanCancel(User $customer, Appointment $appointment): void
    {
        if (! $this->enabled() || $this->isStaffExempt($customer)) {
            return;
        }

        if ((int) $appointment->customer_user_id !== (int) $customer->id) {
            return;
        }

        $day = CarbonImmutable::now()->format('Y-m-d');
        $dayKey = "abuse:cancels:day:{$customer->id}:{$day}";
        $dayCount = (int) Cache::get($dayKey, 0);
        $maxDay = max(6, (int) config('abuse.cancel.max_per_day', 12));

        if ($dayCount >= $maxDay) {
            throw new AbuseBlockedException(
                'You have cancelled several visits today. Contact the shop if your plans changed.',
                'cancel_daily_limit',
            );
        }

        $windowHours = max(1, (int) config('abuse.cancel.window_hours', 24));
        $since = CarbonImmutable::now()->subHours($windowHours);

        $recentCancels = Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CANCELLED)
            ->where('updated_at', '>=', $since->toDateTimeString())
            ->count();

        $recentBooks = (int) Cache::get("abuse:bookings:window:{$customer->id}", 0);
        $minCancels = max(4, (int) config('abuse.cancel.serial_pattern_cancels', 6));
        $minBooks = max(4, (int) config('abuse.cancel.serial_pattern_bookings', 6));

        if ($recentCancels >= $minCancels && $recentBooks >= $minBooks) {
            throw new AbuseBlockedException(
                'Unusual booking activity was detected on your account. Contact the shop to adjust visits.',
                'cancel_abuse_pattern',
            );
        }
    }

    public function recordCustomerCancel(User $customer): void
    {
        if (! $this->enabled()) {
            return;
        }

        $day = CarbonImmutable::now()->format('Y-m-d');
        $dayKey = "abuse:cancels:day:{$customer->id}:{$day}";
        Cache::add($dayKey, 0, now()->addDay());
        Cache::increment($dayKey);

        $this->logSuspiciousSignals($customer, 'cancel_recorded');
    }

    public function assertCanSendThreadNote(
        User $sender,
        Appointment $appointment,
        string $normalizedBody,
    ): void {
        if (! $this->enabled() || $this->isStaffExempt($sender)) {
            return;
        }

        $maxNotes = max(15, (int) config('abuse.messaging.max_notes_per_appointment_per_hour', 30));
        $noteKey = "abuse:notes:{$appointment->id}:{$sender->id}";
        $noteCount = (int) Cache::get($noteKey, 0);
        if ($noteCount >= $maxNotes) {
            throw new AbuseBlockedException(
                'You have sent many messages for this visit. Use a quick ping or try again later.',
                'message_rate_limit',
                300,
            );
        }

        $maxLinks = max(1, (int) config('abuse.messaging.max_links_per_note', 4));
        if (preg_match_all('/https?:\/\//i', $normalizedBody) > $maxLinks) {
            throw new AbuseBlockedException(
                'Please keep links to a minimum in visit messages.',
                'message_links',
            );
        }

        $cooldown = max(15, (int) config('abuse.messaging.duplicate_body_cooldown_seconds', 45));
        $dupKey = 'abuse:dup:'.hash('xxh128', $appointment->id.'|'.$sender->id.'|'.$normalizedBody);
        if (Cache::has($dupKey)) {
            throw new AbuseBlockedException(
                'That message was just sent.',
                'duplicate_message',
                $cooldown,
            );
        }
    }

    public function recordThreadNote(
        User $sender,
        Appointment $appointment,
        string $normalizedBody,
    ): void {
        if (! $this->enabled() || $this->isStaffExempt($sender)) {
            return;
        }

        $noteKey = "abuse:notes:{$appointment->id}:{$sender->id}";
        Cache::add($noteKey, 0, now()->addHour());
        Cache::increment($noteKey);

        $cooldown = max(15, (int) config('abuse.messaging.duplicate_body_cooldown_seconds', 45));
        $dupKey = 'abuse:dup:'.hash('xxh128', $appointment->id.'|'.$sender->id.'|'.$normalizedBody);
        Cache::put($dupKey, 1, now()->addSeconds($cooldown));
    }

    /**
     * @return list<array{code: string, detail: string}>
     */
    public function suspiciousSignalsFor(User $customer): array
    {
        if ($this->isStaffExempt($customer)) {
            return [];
        }

        $signals = [];
        $windowHours = max(1, (int) config('abuse.cancel.window_hours', 24));
        $since = CarbonImmutable::now()->subHours($windowHours);

        $recentCancels = Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CANCELLED)
            ->where('updated_at', '>=', $since->toDateTimeString())
            ->count();

        $recentBooks = (int) Cache::get("abuse:bookings:window:{$customer->id}", 0);

        if ($recentCancels >= 3 && $recentBooks >= 3 && $recentCancels >= (int) ceil($recentBooks * 0.75)) {
            $signals[] = [
                'code' => 'elevated_cancel_ratio',
                'detail' => "{$recentCancels} cancellations vs {$recentBooks} bookings in {$windowHours}h",
            ];
        }

        $unpaid = Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('payment_status', Appointment::PAYMENT_REQUIRES_PAYMENT)
            ->where('starts_at', '>', now()->toDateTimeString())
            ->count();

        if ($unpaid >= 2) {
            $signals[] = [
                'code' => 'multiple_unpaid_deposits',
                'detail' => "{$unpaid} upcoming visits awaiting deposit payment",
            ];
        }

        $noteBursts = AppointmentMessage::query()
            ->where('sender_user_id', $customer->id)
            ->where('kind', AppointmentMessage::KIND_NOTE)
            ->where('created_at', '>=', CarbonImmutable::now()->subHour()->toDateTimeString())
            ->count();

        if ($noteBursts >= 20) {
            $signals[] = [
                'code' => 'message_burst',
                'detail' => "{$noteBursts} freeform notes in the last hour",
            ];
        }

        return $signals;
    }

    private function logSuspiciousSignals(User $customer, string $trigger): void
    {
        $signals = $this->suspiciousSignalsFor($customer);
        if ($signals === []) {
            return;
        }

        Log::info('abuse.suspicious_activity', [
            'user_id' => $customer->id,
            'trigger' => $trigger,
            'signals' => $signals,
        ]);
    }
}
