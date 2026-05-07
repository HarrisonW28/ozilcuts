<?php

namespace App\Models;

use Database\Factories\BarberAvailabilityWindowFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BarberAvailabilityWindow extends Model
{
    /** @use HasFactory<BarberAvailabilityWindowFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'barber_profile_id',
        'weekday',
        'starts_at',
        'ends_at',
    ];

    /**
     * @return BelongsTo<BarberProfile, $this>
     */
    public function barberProfile(): BelongsTo
    {
        return $this->belongsTo(BarberProfile::class);
    }
}
