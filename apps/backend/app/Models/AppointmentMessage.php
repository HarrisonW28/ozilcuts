<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentMessage extends Model
{
    public const KIND_NOTE = 'note';

    public const KIND_OPERATIONAL = 'operational';

    public const KIND_PRESET = 'preset';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'appointment_id',
        'sender_user_id',
        'kind',
        'operational_key',
        'body',
    ];

    /**
     * @return BelongsTo<Appointment, $this>
     */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }
}
