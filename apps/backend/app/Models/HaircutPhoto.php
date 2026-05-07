<?php

namespace App\Models;

use Database\Factories\HaircutPhotoFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HaircutPhoto extends Model
{
    /** @use HasFactory<HaircutPhotoFactory> */
    use HasFactory;

    public const KIND_BEFORE = 'before';

    public const KIND_AFTER = 'after';

    public const KINDS = [self::KIND_BEFORE, self::KIND_AFTER];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'appointment_id',
        'uploaded_by_user_id',
        'kind',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size_bytes',
        'caption',
        'is_public',
        'customer_consent',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'is_public' => 'boolean',
            'customer_consent' => 'boolean',
        ];
    }

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
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    /**
     * @param  Builder<HaircutPhoto>  $query
     * @return Builder<HaircutPhoto>
     */
    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query->where('is_public', true)->where('customer_consent', true);
    }
}
