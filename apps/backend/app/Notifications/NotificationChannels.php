<?php

namespace App\Notifications;

/**
 * Allow-list of notification channel keys. Channels are toggled per-user
 * and per-event via NotificationPreference rows.
 */
final class NotificationChannels
{
    public const MAIL = 'mail';

    public const IN_APP = 'inapp';

    /** @var list<string> */
    public const ALL = [
        self::MAIL,
        self::IN_APP,
    ];

    /** @var array<string, array{label: string}> */
    public const META = [
        self::MAIL => ['label' => 'Email'],
        self::IN_APP => ['label' => 'In-app'],
    ];
}
