<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Re-issues a Stripe PaymentIntent client_secret for an appointment that's
 * still awaiting deposit. Lets the confirmation page resume payment after a
 * page reload without exposing the secret on subsequent appointment fetches.
 */
final class AppointmentPaymentIntentController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        PaymentService $payments,
    ): JsonResponse {
        $this->authorize('view', $appointment);

        if ($appointment->customer_user_id !== $request->user()?->id) {
            // Only the customer ever needs the client_secret; barbers/admins
            // can see status but shouldn't pay on behalf of someone else.
            return response()->json(['client_secret' => null]);
        }

        $clientSecret = $payments->ensureDepositIntent($appointment);

        return response()->json([
            'enabled' => $payments->isEnabled(),
            'currency' => $payments->currency(),
            'publishable_key' => (string) config('services.stripe.publishable', '') ?: null,
            'client_secret' => $clientSecret,
            'payment_status' => $appointment->fresh()?->payment_status,
            'deposit_cents' => (int) $appointment->deposit_cents,
        ]);
    }
}
