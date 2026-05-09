<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentReminder extends Model
{
    public const KIND_DAY_BEFORE = 'day_before';

    public const KIND_HOUR_BEFORE = 'hour_before';

    /** @var list<string> */
    public const SCHEDULED_KINDS = [
        self::KIND_DAY_BEFORE,
        self::KIND_HOUR_BEFORE,
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'appointment_id',
        'kind',
        'sent_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Appointment, $this>
     */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
