<?php

namespace App\Models;

use Database\Factories\HairProfileFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HairProfile extends Model
{
    /** @use HasFactory<HairProfileFactory> */
    use HasFactory;

    public const HAIR_TYPES = ['straight', 'wavy', 'curly', 'coily'];

    public const HAIR_THICKNESSES = ['fine', 'medium', 'thick'];

    public const HAIR_LENGTHS = ['very_short', 'short', 'medium', 'long'];

    public const SCALP_CONDITIONS = ['normal', 'dry', 'oily', 'sensitive'];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'hair_type',
        'hair_thickness',
        'hair_length',
        'scalp_condition',
        'preferred_clipper_guard',
        'allergies',
        'styling_notes',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<HairProfilePhoto, $this>
     */
    public function photos(): HasMany
    {
        return $this->hasMany(HairProfilePhoto::class)->orderByDesc('id');
    }
}
