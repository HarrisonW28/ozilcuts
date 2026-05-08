<?php

namespace App\Services\Notifications;

use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Notifications\NotificationChannels;
use App\Notifications\NotificationEvents;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;

/**
 * Single dispatch point for user-facing notifications across channels.
 *
 * Channels: 'mail' and 'inapp'. Each channel honours per-user, per-event
 * preferences (NotificationPreference rows). Default is opt-in: when no
 * row exists for a (user, event, channel) tuple, the channel is enabled.
 *
 * The service preserves the existing CC'd-mail pattern (one Mailable, one
 * recipient as TO with optional CC emails) so the email shape doesn't
 * change. In-app notifications are inserted per recipient and respect that
 * recipient's own in-app preference.
 */
final class NotificationService
{
    /**
     * Send a notification event to a single recipient. The mail channel is
     * triggered when $mail is provided AND the recipient has email enabled
     * for the event. The in-app channel is triggered when the recipient
     * has in-app enabled for the event.
     *
     * @param  array<string, mixed>  $data
     * @param  list<string>  $mailCcEmails
     */
    public function send(
        User $recipient,
        string $eventType,
        array $data,
        ?Mailable $mail = null,
        array $mailCcEmails = [],
    ): void {
        $this->assertEventType($eventType);

        if ($mail !== null && $this->isEnabled($recipient, $eventType, NotificationChannels::MAIL)) {
            $pendingMail = Mail::to($recipient->email);
            foreach (array_unique(array_filter($mailCcEmails)) as $ccEmail) {
                if ($ccEmail !== $recipient->email) {
                    $pendingMail->cc($ccEmail);
                }
            }
            $pendingMail->queue($mail);
        }

        if ($this->isEnabled($recipient, $eventType, NotificationChannels::IN_APP)) {
            Notification::query()->create([
                'user_id' => $recipient->id,
                'type' => $eventType,
                'data' => $data,
                'read_at' => null,
            ]);
        }
    }

    public function unreadCount(User $user): int
    {
        return (int) Notification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();
    }

    public function markRead(Notification $notification): Notification
    {
        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
            $notification->refresh();
        }

        return $notification;
    }

    public function markAllRead(User $user): int
    {
        return (int) Notification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    /**
     * Full preferences matrix for the user, including defaults for
     * (event, channel) tuples that haven't been customised yet.
     *
     * @return list<array{event_key: string, channel: string, enabled: bool}>
     */
    public function preferences(User $user): array
    {
        $stored = NotificationPreference::query()
            ->where('user_id', $user->id)
            ->get(['event_key', 'channel', 'enabled'])
            ->keyBy(fn (NotificationPreference $p) => $p->event_key.'|'.$p->channel);

        $matrix = [];
        foreach (NotificationEvents::ALL as $eventKey) {
            foreach (NotificationChannels::ALL as $channel) {
                $row = $stored->get($eventKey.'|'.$channel);
                $matrix[] = [
                    'event_key' => $eventKey,
                    'channel' => $channel,
                    'enabled' => $row !== null ? (bool) $row->enabled : true,
                ];
            }
        }

        return $matrix;
    }

    /**
     * Replace the user's preferences with the supplied matrix. Unknown
     * event/channel tuples are ignored. Tuples not present in $matrix keep
     * the default (enabled).
     *
     * @param  list<array{event_key: string, channel: string, enabled: bool}>  $matrix
     */
    public function setPreferences(User $user, array $matrix): void
    {
        foreach ($matrix as $row) {
            if (
                ! in_array($row['event_key'], NotificationEvents::ALL, true)
                || ! in_array($row['channel'], NotificationChannels::ALL, true)
            ) {
                continue;
            }
            NotificationPreference::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'event_key' => $row['event_key'],
                    'channel' => $row['channel'],
                ],
                [
                    'enabled' => (bool) $row['enabled'],
                ],
            );
        }
    }

    private function isEnabled(User $user, string $eventType, string $channel): bool
    {
        $row = NotificationPreference::query()
            ->where('user_id', $user->id)
            ->where('event_key', $eventType)
            ->where('channel', $channel)
            ->first(['enabled']);

        return $row === null ? true : (bool) $row->enabled;
    }

    private function assertEventType(string $eventType): void
    {
        if (! in_array($eventType, NotificationEvents::ALL, true)) {
            throw new \InvalidArgumentException("Unknown notification event type: {$eventType}");
        }
    }
}
