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

    public const ARRIVAL_EXPECTED = 'expected';

    public const ARRIVAL_ARRIVED = 'arrived';

    public const ARRIVAL_WAITING = 'waiting';

    public const ARRIVAL_IN_CHAIR = 'in_chair';

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
        'arrival_state',
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
            'arrival_nearby_customer_notified_at' => 'datetime',
            'arrival_nearby_barber_notified_at' => 'datetime',
            'arrival_checked_in_barber_notified_at' => 'datetime',
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

    /**
     * @return HasMany<AppointmentMessage, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(AppointmentMessage::class)->orderBy('id');
    }

    /**
     * @return HasMany<AppointmentAdjustmentRequest, $this>
     */
    public function adjustmentRequests(): HasMany
    {
        return $this->hasMany(AppointmentAdjustmentRequest::class);
    }
}
