<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWalkInAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Services\Booking\BookingService;
use App\Services\Notifications\AppointmentStaffAlertService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class AppointmentWalkInStoreController extends Controller
{
    public function __invoke(
        StoreWalkInAppointmentRequest $request,
        BookingService $booking,
        PaymentService $payments,
        AppointmentStaffAlertService $staffAlerts,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        try {
            $appointment = $booking->bookWalkIn($user, [
                'barber_user_id' => (int) $request->validated('barber_user_id'),
                'service_id' => (int) $request->validated('service_id'),
                'starts_at' => (string) $request->validated('starts_at'),
                'walk_in_name' => $request->validated('walk_in_name'),
                'notes' => $request->validated('notes'),
            ]);
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $appointment->load(['service', 'barber', 'customer']);
        $staffAlerts->bookingCreated($appointment, $user);

        $body = (new AppointmentResource($appointment))->toArray($request);
        $body['payment'] = [
            'enabled' => $payments->isEnabled(),
            'currency' => $payments->currency(),
            'publishable_key' => (string) config('services.stripe.publishable', '') ?: null,
            'client_secret' => null,
        ];

        return response()->json($body, 201);
    }
}
