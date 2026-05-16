<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Services\Availability\BarberAvailabilityService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $base = [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'role' => [
                'id' => $this->role->id,
                'slug' => $this->role->slug,
                'name' => $this->role->name,
            ],
        ];

        if ($this->isAdmin()) {
            $shopHours = null;
            if (is_array($this->shop_default_hours)) {
                $shopHours = [
                    'weekdays' => app(BarberAvailabilityService::class)->groupedFromFlatWindows($this->shop_default_hours),
                ];
            }

            $base['shop_admin'] = [
                'shop_display_name' => $this->shop_display_name,
                'onboarding_step' => (int) $this->onboarding_step,
                'onboarding_completed_at' => $this->onboarding_completed_at?->toIso8601String(),
                'shop_pays_cash_only' => (bool) $this->shop_pays_cash_only,
                'shop_deposits_enabled' => (bool) $this->shop_deposits_enabled,
                'shop_tap_to_pay_later' => (bool) $this->shop_tap_to_pay_later,
                'shop_default_hours' => $shopHours,
                'shop_hero_video_path' => $this->shop_hero_video_path,
                'shop_hero_poster_path' => $this->shop_hero_poster_path,
            ];
        }

        return $base;
    }
}
