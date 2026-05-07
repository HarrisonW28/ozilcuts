<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\User;
use App\Services\Booking\BookingService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BarberSlotsController extends Controller
{
    public function __invoke(Request $request, User $user, BookingService $booking): JsonResponse
    {
        $data = $request->validate([
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'date' => ['required', 'date_format:Y-m-d'],
            'exclude_appointment_id' => ['sometimes', 'integer', 'exists:appointments,id'],
        ]);

        $service = Service::query()->where('is_active', true)->find($data['service_id']);
        if ($service === null) {
            return response()->json([
                'date' => $data['date'],
                'service_id' => (int) $data['service_id'],
                'duration_minutes' => 0,
                'slots' => [],
            ]);
        }

        $date = CarbonImmutable::createFromFormat('Y-m-d', $data['date'])->startOfDay();
        $slots = $booking->availableSlots(
            $user,
            $service,
            $date,
            isset($data['exclude_appointment_id']) ? (int) $data['exclude_appointment_id'] : null,
        );

        return response()->json([
            'date' => $date->format('Y-m-d'),
            'service_id' => $service->id,
            'duration_minutes' => $service->duration_minutes,
            'slots' => $slots,
        ]);
    }
}
