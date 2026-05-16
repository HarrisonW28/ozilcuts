<?php

namespace App\Models;

use Database\Factories\BarberProfileFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BarberProfile extends Model
{
    /** @use HasFactory<BarberProfileFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'title',
        'bio',
        'years_experience',
        'specialties',
        'is_published',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'specialties' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<BarberAvailabilityWindow, $this>
     */
    public function availabilityWindows(): HasMany
    {
        return $this->hasMany(BarberAvailabilityWindow::class);
    }
}
