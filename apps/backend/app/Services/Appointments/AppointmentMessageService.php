<?php

namespace App\Services\Appointments;

use App\Models\Appointment;
use App\Models\AppointmentMessage;
use App\Models\AppointmentMessageRead;
use App\Models\User;
use App\Notifications\NotificationEvents;
use App\Policies\AppointmentPolicy;
use App\Services\Notifications\AppointmentNotificationPayload;
use App\Services\Notifications\NotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Appointment-scoped thread: short notes + canned operational pings.
 * Not a general-purpose chat — no rich social features.
 */
final class AppointmentMessageService
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    /** @var array<string, string> */
    private const SHOP_SIDE_KEYS = [
        'ready_relaxed' => 'I’m ready on my side — come in whenever feels easy for you.',
        'chair_ready' => 'Your chair is ready — come on in when you are.',
        'outside_now' => 'I’m outside now — give me a wave when you’re heading out.',
        'parking_help' => 'Parking: reply here if you need directions; we’ll keep it to this thread.',
        'running_5' => 'Running about 5 minutes late on this visit.',
        'running_10' => 'Running about 10 minutes late on this visit.',
        'running_15' => 'Running about 15 minutes late on this visit.',
        'almost_ready' => 'Almost ready — thanks for waiting nearby.',
        'thanks_patience' => 'Thanks for your patience today.',
        /** Thread-only: posted when the queue advances to “waiting” (not shown as a chip). */
        'arrival_auto_shop_queue' => 'You’re next in the queue — I’ll bring you over calmly when it’s time.',
    ];

    /** @var list<string> */
    private const SHOP_SIDE_KEY_ORDER = [
        'running_5',
        'running_10',
        'running_15',
        'parking_help',
        'outside_now',
        'chair_ready',
        'almost_ready',
        'thanks_patience',
    ];

    /** @var list<string> */
    private const SHOP_ARRIVAL_BOOST_ORDER = [
        'ready_relaxed',
        'chair_ready',
        'outside_now',
        'parking_help',
        'running_5',
        'running_10',
        'running_15',
        'almost_ready',
        'thanks_patience',
    ];

    /** @var array<string, string> */
    private const GUEST_SIDE_KEYS = [
        'arriving_now' => 'Arriving now — stepping out and walking over shortly.',
        'parking_nearby' => 'Parked nearby — heading in at an easy pace.',
        'at_the_door' => 'At the door — coming inside when it feels right.',
        'eta_about_3' => 'About three minutes out — thanks for the buffer.',
        'eta_about_7' => 'About seven minutes out — keeping you posted.',
        'eta_about_10' => 'Roughly ten minutes away — appreciate the patience.',
        'outside_now' => 'I’m outside the shop now.',
        'parking_question' => 'Quick question about where to park.',
        'on_my_way' => 'On my way — arriving shortly.',
        'slightly_late' => 'I may be a few minutes late.',
        'chair_heading' => 'Heading to the chair now.',
        /** Thread-only: posted when the guest checks in on site (not shown as a chip). */
        'arrival_auto_guest_checked_in' => 'Checked in on site — heading inside calmly.',
    ];

    /** @var list<string> */
    private const GUEST_SIDE_KEY_ORDER = [
        'slightly_late',
        'parking_question',
        'outside_now',
        'on_my_way',
        'chair_heading',
        'eta_about_3',
        'eta_about_7',
        'eta_about_10',
    ];

    /** @var list<string> */
    private const GUEST_ARRIVAL_BOOST_ORDER = [
        'arriving_now',
        'parking_nearby',
        'slightly_late',
        'at_the_door',
        'outside_now',
        'parking_question',
        'eta_about_3',
        'eta_about_7',
        'eta_about_10',
        'on_my_way',
        'chair_heading',
    ];

    /** @var array<string, string> */
    private const SHOP_PRESET_KEYS = [
        'preset_got_it' => 'Got it — thanks for the update.',
        'preset_see_you' => 'See you at the booked time.',
        'preset_here_if_needed' => 'Here if you need anything before you arrive.',
    ];

    /** @var list<string> */
    private const SHOP_PRESET_KEY_ORDER = [
        'preset_got_it',
        'preset_see_you',
        'preset_here_if_needed',
    ];

    /** @var array<string, string> */
    private const GUEST_PRESET_KEYS = [
        'preset_thanks' => 'Thanks — see you soon.',
        'preset_appreciate' => 'Appreciate the heads-up.',
        'preset_ok' => 'Understood — speak shortly.',
    ];

    /** @var list<string> */
    private const GUEST_PRESET_KEY_ORDER = [
        'preset_thanks',
        'preset_appreciate',
        'preset_ok',
    ];

    /**
     * @return array{
     *     messages: list<array<string, mixed>>,
     *     meta: array{
     *         viewer_last_read_message_id: int|null,
     *         unread_from_others: int,
     *         can_send: bool,
     *         thread_closed_reason: 'cancelled'|'ended'|null,
     *         operational_keys: list<string>,
     *         preset_keys: list<string>,
     *         in_arrival_messaging_window: bool,
     *     },
     * }
     */
    public function listForViewer(
        Appointment $appointment,
        User $viewer,
        ?int $afterId,
        int $limit = 80,
    ): array {
        $appointment->loadMissing(['customer', 'barber']);

        $q = AppointmentMessage::query()
            ->where('appointment_id', $appointment->id)
            ->with(['sender.role'])
            ->orderBy('id');

        if ($afterId !== null && $afterId > 0) {
            $q->where('id', '>', $afterId);
        }

        $rows = $q->limit(max(1, min(120, $limit)))->get();

        $read = AppointmentMessageRead::query()
            ->where('appointment_id', $appointment->id)
            ->where('user_id', $viewer->id)
            ->first();

        $lastReadId = $read?->last_read_message_id;

        $unreadQuery = AppointmentMessage::query()
            ->where('appointment_id', $appointment->id)
            ->where(function ($w) use ($viewer): void {
                $w->whereNull('sender_user_id')
                    ->orWhere('sender_user_id', '!=', $viewer->id);
            });
        if ($lastReadId !== null) {
            $unreadQuery->where('id', '>', $lastReadId);
        }
        $unread = (int) $unreadQuery->count();

        $messages = [];
        foreach ($rows as $m) {
            $messages[] = $this->serializeMessage($appointment, $m);
        }

        $inArrivalWindow = $this->inArrivalMessagingWindow($appointment);

        return [
            'messages' => $messages,
            'meta' => [
                'viewer_last_read_message_id' => $lastReadId,
                'unread_from_others' => $unread,
                'can_send' => $viewer->can('sendMessages', $appointment),
                'thread_closed_reason' => $this->threadClosedReason($appointment),
                'operational_keys' => $this->operationalKeysFor($viewer, $appointment, $inArrivalWindow),
                'preset_keys' => $this->presetKeysFor($viewer, $appointment),
                'in_arrival_messaging_window' => $inArrivalWindow,
            ],
        ];
    }

    /**
     * Mirrors {@see AppointmentPolicy} on-site arrival window: confirmed
     * visits from 36h before start through 60 minutes after the scheduled end.
     */
    public function inArrivalMessagingWindow(Appointment $appointment): bool
    {
        if ($appointment->status !== Appointment::STATUS_CONFIRMED) {
            return false;
        }
        $start = $appointment->starts_at;
        $end = $appointment->ends_at;
        if ($start === null || $end === null) {
            return false;
        }
        $startAt = CarbonImmutable::parse((string) $start);
        $endAt = CarbonImmutable::parse((string) $end);
        $now = CarbonImmutable::now();

        return $now->greaterThanOrEqualTo($startAt->subHours(36))
            && $now->lessThanOrEqualTo($endAt->addMinutes(60));
    }

    public function recordArrivalStateTransition(
        Appointment $appointment,
        User $actor,
        string $from,
        string $to,
    ): void {
        if (! $actor->can('sendMessages', $appointment)) {
            return;
        }
        if (! $this->inArrivalMessagingWindow($appointment)) {
            return;
        }

        $cid = $appointment->customer_user_id;
        $bid = $appointment->barber_user_id;
        $key = null;
        if ($cid !== null && (int) $actor->id === (int) $cid
            && $from === Appointment::ARRIVAL_EXPECTED && $to === Appointment::ARRIVAL_ARRIVED) {
            $key = 'arrival_auto_guest_checked_in';
        } elseif ($bid !== null && (int) $actor->id === (int) $bid
            && $from === Appointment::ARRIVAL_ARRIVED && $to === Appointment::ARRIVAL_WAITING) {
            $key = 'arrival_auto_shop_queue';
        }
        if ($key === null) {
            return;
        }

        $this->store($appointment, $actor, AppointmentMessage::KIND_OPERATIONAL, null, $key);
    }

    public function store(
        Appointment $appointment,
        User $sender,
        string $kind,
        ?string $body,
        ?string $operationalKey,
        ?string $presetKey = null,
    ): AppointmentMessage {
        $resolvedBody = match ($kind) {
            AppointmentMessage::KIND_OPERATIONAL => $this->resolveOperationalBody(
                $appointment,
                $sender,
                (string) $operationalKey,
            ),
            AppointmentMessage::KIND_PRESET => $this->resolvePresetBody(
                $appointment,
                $sender,
                (string) $presetKey,
            ),
            default => $this->normalizeNoteBody((string) $body),
        };

        $storedKey = match ($kind) {
            AppointmentMessage::KIND_OPERATIONAL => $operationalKey,
            AppointmentMessage::KIND_PRESET => $presetKey,
            default => null,
        };

        $row = new AppointmentMessage([
            'appointment_id' => $appointment->id,
            'sender_user_id' => $sender->id,
            'kind' => $kind,
            'operational_key' => $storedKey,
            'body' => $resolvedBody,
        ]);
        $row->save();

        $this->notifyVisitThreadPartner($appointment, $sender, $row);

        return $row;
    }

    /**
     * In-app ping only — no email. Skips automated arrival transition lines.
     */
    private function notifyVisitThreadPartner(
        Appointment $appointment,
        User $sender,
        AppointmentMessage $message,
    ): void {
        $key = (string) ($message->operational_key ?? '');
        if ($key !== '' && str_starts_with($key, 'arrival_auto_')) {
            return;
        }

        $appointment->loadMissing(['customer', 'barber', 'service']);

        $cid = $appointment->customer_user_id;
        $bid = $appointment->barber_user_id;
        $urgency = in_array($message->kind, [
            AppointmentMessage::KIND_OPERATIONAL,
            AppointmentMessage::KIND_PRESET,
        ], true) ? 'operational' : 'standard';

        $previewSource = (string) $message->body;
        $preview = mb_strlen($previewSource) > 200
            ? mb_substr($previewSource, 0, 200).'…'
            : $previewSource;

        $base = AppointmentNotificationPayload::build($appointment) + [
            'message_id' => (int) $message->id,
            'message_kind' => $message->kind,
            'message_preview' => $preview,
            'sender_name' => $sender->name,
            'operational_key' => $message->operational_key,
            'urgency' => $urgency,
            'deep_link' => '/appointments/'.$appointment->id.'/confirmation?thread=1',
            'thread_group_key' => 'visit_thread:'.$appointment->id,
        ];

        $isCustomerSender = $cid !== null && (int) $cid === (int) $sender->id;
        $isShopSender = $sender->isAdmin()
            || ($bid !== null && (int) $bid === (int) $sender->id);

        if ($isCustomerSender && $bid !== null && (int) $bid !== (int) $sender->id) {
            $barber = $appointment->barber;
            if ($barber !== null) {
                $this->notifications->send(
                    $barber,
                    NotificationEvents::STAFF_VISIT_MESSAGE,
                    $base,
                    mail: null,
                );
            }
        }

        if ($isShopSender && $cid !== null && (int) $cid !== (int) $sender->id) {
            $customer = $appointment->customer;
            if ($customer !== null) {
                $this->notifications->send(
                    $customer,
                    NotificationEvents::APPOINTMENT_VISIT_MESSAGE,
                    $base,
                    mail: null,
                );
            }
        }
    }

    public function formatMessage(Appointment $appointment, AppointmentMessage $m): array
    {
        $m->loadMissing(['sender.role']);

        return $this->serializeMessage($appointment, $m);
    }

    public function markRead(
        Appointment $appointment,
        User $viewer,
        int $lastReadMessageId,
    ): void {
        $exists = AppointmentMessage::query()
            ->where('appointment_id', $appointment->id)
            ->where('id', $lastReadMessageId)
            ->exists();
        if (! $exists) {
            return;
        }

        DB::transaction(function () use ($appointment, $viewer, $lastReadMessageId): void {
            $read = AppointmentMessageRead::query()->firstOrNew([
                'appointment_id' => $appointment->id,
                'user_id' => $viewer->id,
            ]);
            $current = (int) ($read->last_read_message_id ?? 0);
            if ($lastReadMessageId > $current) {
                $read->last_read_message_id = $lastReadMessageId;
                $read->save();
            }
        });
    }

    /**
     * @return 'cancelled'|'ended'|null
     */
    private function threadClosedReason(Appointment $appointment): ?string
    {
        if ($appointment->status !== Appointment::STATUS_CONFIRMED) {
            return 'cancelled';
        }
        $end = $appointment->ends_at;
        if ($end === null) {
            return null;
        }
        if (CarbonImmutable::now()->greaterThan(CarbonImmutable::parse((string) $end)->addHours(24))) {
            return 'ended';
        }

        return null;
    }

    private function resolveOperationalBody(
        Appointment $appointment,
        User $sender,
        string $key,
    ): string {
        $key = trim($key);
        $shopSide = $sender->isAdmin() || $appointment->barber_user_id === $sender->id;
        $customerSide = $appointment->customer_user_id !== null
            && $appointment->customer_user_id === $sender->id;

        $map = $shopSide ? self::SHOP_SIDE_KEYS : ($customerSide ? self::GUEST_SIDE_KEYS : []);
        if (! isset($map[$key])) {
            abort(422, 'Unknown operational template for your role.');
        }

        return $map[$key];
    }

    private function resolvePresetBody(
        Appointment $appointment,
        User $sender,
        string $key,
    ): string {
        $key = trim($key);
        $shopSide = $sender->isAdmin() || $appointment->barber_user_id === $sender->id;
        $customerSide = $appointment->customer_user_id !== null
            && $appointment->customer_user_id === $sender->id;

        $map = $shopSide ? self::SHOP_PRESET_KEYS : ($customerSide ? self::GUEST_PRESET_KEYS : []);
        if (! isset($map[$key])) {
            abort(422, 'Unknown quick reply for your role.');
        }

        return $map[$key];
    }

    /**
     * @return list<string>
     */
    public function operationalKeysFor(User $user, Appointment $appointment, ?bool $inArrivalWindow = null): array
    {
        $shopSide = $user->isAdmin() || $appointment->barber_user_id === $user->id;
        $customerSide = $appointment->customer_user_id !== null
            && $appointment->customer_user_id === $user->id;

        $inWindow = $inArrivalWindow ?? $this->inArrivalMessagingWindow($appointment);

        if ($shopSide) {
            return $this->mergeArrivalOperationalKeys(
                $inWindow,
                self::SHOP_ARRIVAL_BOOST_ORDER,
                self::SHOP_SIDE_KEY_ORDER,
                self::SHOP_SIDE_KEYS,
            );
        }
        if ($customerSide) {
            return $this->mergeArrivalOperationalKeys(
                $inWindow,
                self::GUEST_ARRIVAL_BOOST_ORDER,
                self::GUEST_SIDE_KEY_ORDER,
                self::GUEST_SIDE_KEYS,
            );
        }

        return [];
    }

    /**
     * @return list<string>
     */
    public function presetKeysFor(User $user, Appointment $appointment): array
    {
        $shopSide = $user->isAdmin() || $appointment->barber_user_id === $user->id;
        $customerSide = $appointment->customer_user_id !== null
            && $appointment->customer_user_id === $user->id;

        if ($shopSide) {
            return $this->orderedKeys(self::SHOP_PRESET_KEY_ORDER, self::SHOP_PRESET_KEYS);
        }
        if ($customerSide) {
            return $this->orderedKeys(self::GUEST_PRESET_KEY_ORDER, self::GUEST_PRESET_KEYS);
        }

        return [];
    }

    /**
     * @param  list<string>  $order
     * @param  array<string, string>  $map
     * @return list<string>
     */
    private function orderedKeys(array $order, array $map): array
    {
        $out = [];
        foreach ($order as $key) {
            if (isset($map[$key])) {
                $out[] = $key;
            }
        }

        return $out;
    }

    /**
     * During the on-site arrival window, surface calm arrival + ETA chips first.
     * Omits thread-only auto keys (not user-selectable).
     *
     * @param  list<string>  $boostOrder
     * @param  list<string>  $fallbackOrder
     * @param  array<string, string>  $map
     * @return list<string>
     */
    private function mergeArrivalOperationalKeys(
        bool $inWindow,
        array $boostOrder,
        array $fallbackOrder,
        array $map,
    ): array {
        if (! $inWindow) {
            return $this->orderedKeys($fallbackOrder, $map);
        }

        $seen = [];
        $out = [];
        foreach ($boostOrder as $key) {
            if ($this->isThreadOnlyOperationalKey($key)) {
                continue;
            }
            if (isset($map[$key]) && ! isset($seen[$key])) {
                $out[] = $key;
                $seen[$key] = true;
            }
        }
        foreach ($fallbackOrder as $key) {
            if ($this->isThreadOnlyOperationalKey($key)) {
                continue;
            }
            if (isset($map[$key]) && ! isset($seen[$key])) {
                $out[] = $key;
                $seen[$key] = true;
            }
        }

        return $out;
    }

    private function isThreadOnlyOperationalKey(string $key): bool
    {
        return str_starts_with($key, 'arrival_auto_');
    }

    private function normalizeNoteBody(string $body): string
    {
        $body = trim(preg_replace('/\s+/u', ' ', $body) ?? '');
        if ($body === '') {
            abort(422, 'Message cannot be empty.');
        }

        return mb_substr($body, 0, 1000);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeMessage(Appointment $appointment, AppointmentMessage $m): array
    {
        $sender = $m->sender;
        $senderPayload = null;
        if ($sender !== null) {
            $senderPayload = [
                'id' => $sender->id,
                'name' => $sender->name,
                'role' => $this->senderRoleLabel($appointment, $sender),
            ];
        }

        $out = [
            'id' => $m->id,
            'appointment_id' => $m->appointment_id,
            'kind' => $m->kind,
            'operational_key' => $m->operational_key,
            'body' => $m->body,
            'sender' => $senderPayload,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
        if ($m->kind === AppointmentMessage::KIND_PRESET) {
            $out['preset_key'] = $m->operational_key;
        }

        return $out;
    }

    private function senderRoleLabel(Appointment $appointment, User $sender): string
    {
        if ($sender->isAdmin()) {
            return 'admin';
        }
        if ($appointment->barber_user_id === $sender->id) {
            return 'barber';
        }
        if ($appointment->customer_user_id === $sender->id) {
            return 'customer';
        }

        return 'staff';
    }
}
