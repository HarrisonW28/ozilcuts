<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentRebookNudge extends Model
{
    public const STATE_SENT = 'sent';

    public const STATE_SNOOZED = 'snoozed';

    /** @var list<string> */
    public const STATES = [
        self::STATE_SENT,
        self::STATE_SNOOZED,
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'source_appointment_id',
        'user_id',
        'state',
        'sent_at',
        'snooze_until',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'snooze_until' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Appointment, $this>
     */
    public function sourceAppointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'source_appointment_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
