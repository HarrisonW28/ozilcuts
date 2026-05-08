<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Mail\AppointmentConfirmedMail;
use App\Models\Appointment;
use App\Notifications\NotificationEvents;
use App\Services\Booking\BookingService;
use App\Services\Notifications\AppointmentNotificationPayload;
use App\Services\Notifications\NotificationService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class AppointmentStoreController extends Controller
{
    public function __invoke(
        StoreAppointmentRequest $request,
        BookingService $booking,
        PaymentService $payments,
        NotificationService $notifications,
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

        $this->dispatchConfirmation($appointment, $notifications);

        $body = (new AppointmentResource($appointment))->toArray($request);
        $body['payment'] = [
            'enabled' => $payments->isEnabled(),
            'currency' => $payments->currency(),
            'publishable_key' => (string) config('services.stripe.publishable', '') ?: null,
            'client_secret' => $clientSecret,
        ];

        return response()->json($body, 201);
    }

    private function dispatchConfirmation(
        Appointment $appointment,
        NotificationService $notifications,
    ): void {
        $customer = $appointment->customer;
        if ($customer === null) {
            return;
        }
        $barber = $appointment->barber;
        $payload = AppointmentNotificationPayload::build($appointment);

        // Customer is the primary recipient: gets the email (with the
        // barber CC'd) and an in-app notification.
        $notifications->send(
            $customer,
            NotificationEvents::APPOINTMENT_CONFIRMED,
            $payload,
            mail: new AppointmentConfirmedMail($appointment),
            mailCcEmails: $barber?->email !== null ? [$barber->email] : [],
        );

        // Barber gets their own in-app notification (already CC'd on the mail).
        if ($barber !== null && $barber->id !== $customer->id) {
            $notifications->send(
                $barber,
                NotificationEvents::APPOINTMENT_CONFIRMED,
                $payload,
            );
        }
    }
}
