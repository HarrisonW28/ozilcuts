<?php

namespace App\Models;

use Database\Factories\ServiceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    /** @use HasFactory<ServiceFactory> */
    use HasFactory;

    public const DEPOSIT_POLICY_ALWAYS = 'always';

    public const DEPOSIT_POLICY_FIRST_TIME_CUSTOMER = 'first_time_customer';

    public const DEPOSIT_POLICIES = [
        self::DEPOSIT_POLICY_ALWAYS,
        self::DEPOSIT_POLICY_FIRST_TIME_CUSTOMER,
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'description',
        'duration_minutes',
        'price_cents',
        'deposit_cents',
        'deposit_policy',
        'sort_order',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
