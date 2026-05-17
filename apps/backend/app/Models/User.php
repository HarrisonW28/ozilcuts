<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'provider',
        'provider_id',
        'shop_display_name',
        'onboarding_step',
        'onboarding_completed_at',
        'shop_pays_cash_only',
        'shop_deposits_enabled',
        'shop_tap_to_pay_later',
        'shop_default_hours',
        'shop_latitude',
        'shop_longitude',
        'shop_hero_video_path',
        'shop_hero_poster_path',
        'shop_logo_path',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'terms_accepted_at' => 'datetime',
            'privacy_policy_accepted_at' => 'datetime',
            'password' => 'hashed',
            'onboarding_completed_at' => 'datetime',
            'shop_pays_cash_only' => 'boolean',
            'shop_deposits_enabled' => 'boolean',
            'shop_tap_to_pay_later' => 'boolean',
            'shop_default_hours' => 'array',
            'shop_latitude' => 'float',
            'shop_longitude' => 'float',
        ];
    }

    /**
     * @return BelongsTo<Role, $this>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * @return HasOne<BarberProfile, $this>
     */
    public function barberProfile(): HasOne
    {
        return $this->hasOne(BarberProfile::class);
    }

    /**
     * @return HasOne<CustomerProfile, $this>
     */
    public function customerProfile(): HasOne
    {
        return $this->hasOne(CustomerProfile::class);
    }

    /**
     * @return HasOne<HairProfile, $this>
     */
    public function hairProfile(): HasOne
    {
        return $this->hasOne(HairProfile::class);
    }

    /**
     * @return HasMany<Notification, $this>
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * @return HasMany<NotificationPreference, $this>
     */
    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(NotificationPreference::class);
    }

    /**
     * @param  non-empty-string  ...$slugs
     */
    public function hasRole(string ...$slugs): bool
    {
        $slug = $this->role?->slug;

        return $slug !== null && in_array($slug, $slugs, true);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(Role::SLUG_ADMIN);
    }
}
