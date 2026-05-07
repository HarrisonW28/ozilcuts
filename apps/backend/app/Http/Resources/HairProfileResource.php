<?php

namespace App\Http\Resources;

use App\Models\HairProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin HairProfile
 */
class HairProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'hair_type' => $this->hair_type,
            'hair_thickness' => $this->hair_thickness,
            'hair_length' => $this->hair_length,
            'scalp_condition' => $this->scalp_condition,
            'preferred_clipper_guard' => $this->preferred_clipper_guard,
            'allergies' => $this->allergies,
            'styling_notes' => $this->styling_notes,
            'updated_at' => $this->updated_at?->toIso8601String(),
            'photos' => HairProfilePhotoResource::collection(
                $this->whenLoaded('photos'),
            ),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
        ];
    }
}
