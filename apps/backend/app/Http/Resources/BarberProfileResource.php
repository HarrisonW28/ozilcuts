<?php

namespace App\Http\Resources;

use App\Models\BarberProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BarberProfile
 */
class BarberProfileResource extends JsonResource
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
            'barber' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ],
        ];
    }
}
