<?php

namespace App\Http\Resources;

use App\Models\HairProfilePhoto;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

/**
 * @mixin HairProfilePhoto
 */
class HairProfilePhotoResource extends JsonResource
{
    private const SIGNED_URL_TTL_MINUTES = 15;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'caption' => $this->caption,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'created_at' => $this->created_at?->toIso8601String(),
            'url' => URL::temporarySignedRoute(
                'hair-profile-photos.show',
                CarbonImmutable::now()->addMinutes(self::SIGNED_URL_TTL_MINUTES),
                ['photo' => $this->id],
            ),
        ];
    }
}
