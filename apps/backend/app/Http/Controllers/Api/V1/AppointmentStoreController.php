<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Services\Booking\BookingService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class AppointmentStoreController extends Controller
{
    public function __invoke(StoreAppointmentRequest $request, BookingService $booking): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        try {
            $appointment = $booking->book($user, [
                'service_id' => (int) $request->validated('service_id'),
                'barber_user_id' => (int) $request->validated('barber_user_id'),
                'starts_at' => (string) $request->validated('starts_at'),
                'notes' => $request->validated('notes'),
            ]);
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $appointment->load(['service', 'barber', 'customer']);

        return response()->json(
            (new AppointmentResource($appointment))->toArray($request),
            201,
        );
    }
}
