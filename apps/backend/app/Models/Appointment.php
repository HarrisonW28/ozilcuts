<?php

namespace App\Models;

use Database\Factories\AppointmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appointment extends Model
{
    /** @use HasFactory<AppointmentFactory> */
    use HasFactory;

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_CANCELLED = 'cancelled';

    public const PAYMENT_NOT_REQUIRED = 'not_required';

    public const PAYMENT_REQUIRES_PAYMENT = 'requires_payment';

    public const PAYMENT_PROCESSING = 'processing';

    public const PAYMENT_PAID = 'paid';

    public const PAYMENT_FAILED = 'failed';

    public const PAYMENT_REFUNDED = 'refunded';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'service_id',
        'barber_user_id',
        'customer_user_id',
        'starts_at',
        'ends_at',
        'status',
        'notes',
        'deposit_cents',
        'payment_status',
        'payment_intent_id',
        'amount_paid_cents',
        'paid_at',
        'refunded_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'paid_at' => 'datetime',
            'refunded_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Service, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function barber(): BelongsTo
    {
        return $this->belongsTo(User::class, 'barber_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    /**
     * @return HasMany<HaircutPhoto, $this>
     */
    public function haircutPhotos(): HasMany
    {
        return $this->hasMany(HaircutPhoto::class)->orderBy('kind')->orderBy('id');
    }

    /**
     * @return HasMany<AppointmentReminder, $this>
     */
    public function reminders(): HasMany
    {
        return $this->hasMany(AppointmentReminder::class);
    }
}
