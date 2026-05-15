<?php

namespace App\Http\Resources;

use App\Models\BarberProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BarberProfile
 */
class BarberManageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'bio' => $this->bio,
            'years_experience' => $this->years_experience,
            'is_published' => $this->is_published,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'shop_latitude' => $this->user->shop_latitude !== null
                    ? (float) $this->user->shop_latitude
                    : null,
                'shop_longitude' => $this->user->shop_longitude !== null
                    ? (float) $this->user->shop_longitude
                    : null,
            ],
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
