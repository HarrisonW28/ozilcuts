<?php

namespace App\Http\Resources;

use App\Models\AppointmentReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AppointmentReview
 */
class AppointmentReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $customer = $this->customer;
        $appointment = $this->appointment;

        return [
            'id' => $this->id,
            'appointment_id' => $this->appointment_id,
            'rating' => (int) $this->rating,
            'body' => (string) $this->body,
            'verified' => $this->verified_at !== null,
            'customer_display_name' => $customer !== null
                ? $this->maskName($customer->name)
                : 'Guest',
            'service_name' => $appointment?->service?->name,
            'visited_at' => $appointment?->starts_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    private function maskName(string $fullName): string
    {
        $parts = preg_split('/\s+/', trim($fullName)) ?: [];
        if ($parts === []) {
            return 'Guest';
        }
        if (count($parts) === 1) {
            return $parts[0];
        }

        return $parts[0].' '.mb_substr($parts[count($parts) - 1], 0, 1).'.';
    }
}
