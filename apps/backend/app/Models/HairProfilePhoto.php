<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HairProfilePhoto extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'hair_profile_id',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size_bytes',
        'caption',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<HairProfile, $this>
     */
    public function hairProfile(): BelongsTo
    {
        return $this->belongsTo(HairProfile::class);
    }
}
