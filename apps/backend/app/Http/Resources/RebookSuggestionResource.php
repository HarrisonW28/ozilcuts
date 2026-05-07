<?php

namespace App\Http\Resources;

use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property array{
 *     interval_days: int,
 *     sample_size: int,
 *     suggested_date: string,
 *     last_appointment_at: string|null,
 *     barber_user_id: int,
 *     service_id: int,
 * } $resource
 */
class RebookSuggestionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $payload = $this->resource;
        $service = Service::query()->find($payload['service_id']);
        $barber = User::query()->find($payload['barber_user_id']);

        return [
            'service_id' => $payload['service_id'],
            'barber_user_id' => $payload['barber_user_id'],
            'suggested_date' => $payload['suggested_date'],
            'interval_days' => $payload['interval_days'],
            'sample_size' => $payload['sample_size'],
            'last_appointment_at' => $payload['last_appointment_at'],
            'service' => $service === null ? null : (new ServiceResource($service))->toArray($request),
            'barber' => $barber === null ? null : [
                'id' => $barber->id,
                'name' => $barber->name,
            ],
        ];
    }
}
