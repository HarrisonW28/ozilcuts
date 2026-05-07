<?php

namespace App\Http\Resources;

use App\Models\CustomerProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CustomerProfile
 */
class CustomerProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'phone' => $this->phone,
            'preferred_barber_user_id' => $this->preferred_barber_user_id,
            'preferences' => $this->preferences,
            'marketing_opt_in' => $this->marketing_opt_in,
            'updated_at' => $this->updated_at?->toIso8601String(),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'preferred_barber' => $this->whenLoaded('preferredBarber', fn () => $this->preferredBarber === null ? null : [
                'id' => $this->preferredBarber->id,
                'name' => $this->preferredBarber->name,
            ]),
        ];
    }
}
