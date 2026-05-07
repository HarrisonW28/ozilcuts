<?php

namespace App\Http\Resources;

use App\Models\HaircutPhoto;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

/**
 * @mixin HaircutPhoto
 */
class HaircutPhotoResource extends JsonResource
{
    private const SIGNED_URL_TTL_MINUTES = 15;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'appointment_id' => $this->appointment_id,
            'kind' => $this->kind,
            'caption' => $this->caption,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'is_public' => (bool) $this->is_public,
            'customer_consent' => (bool) $this->customer_consent,
            'uploaded_by_user_id' => $this->uploaded_by_user_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'url' => URL::temporarySignedRoute(
                'haircut-photos.show',
                CarbonImmutable::now()->addMinutes(self::SIGNED_URL_TTL_MINUTES),
                ['photo' => $this->id],
            ),
        ];
    }
}
