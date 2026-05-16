<?php

namespace App\Models;

use Database\Factories\CustomerTagFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CustomerTag extends Model
{
    /** @use HasFactory<CustomerTagFactory> */
    use HasFactory;

    public const MAX_LABEL_LENGTH = 32;

    public const LABEL_VIP = 'vip';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'customer_user_id',
        'created_by_user_id',
        'label',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public static function normalizeLabel(string $label): string
    {
        $trimmed = trim(preg_replace('/\s+/', ' ', $label) ?? '');

        return Str::lower($trimmed);
    }

    public static function isVipLabel(string $label): bool
    {
        return self::normalizeLabel($label) === self::LABEL_VIP;
    }
}
