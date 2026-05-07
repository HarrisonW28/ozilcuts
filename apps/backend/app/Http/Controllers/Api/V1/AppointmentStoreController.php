<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Services\Booking\BookingService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class AppointmentStoreController extends Controller
{
    public function __invoke(
        StoreAppointmentRequest $request,
        BookingService $booking,
        PaymentService $payments,
    ): JsonResponse {
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

        $clientSecret = $payments->ensureDepositIntent($appointment);
        $appointment->load(['service', 'barber', 'customer']);

        $body = (new AppointmentResource($appointment))->toArray($request);
        $body['payment'] = [
            'enabled' => $payments->isEnabled(),
            'currency' => $payments->currency(),
            'publishable_key' => (string) config('services.stripe.publishable', '') ?: null,
            'client_secret' => $clientSecret,
        ];

        return response()->json($body, 201);
    }
}
