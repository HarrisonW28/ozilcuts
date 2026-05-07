<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use UnexpectedValueException;

final class StripeWebhookController extends Controller
{
    public function __invoke(Request $request, PaymentService $payments): JsonResponse
    {
        if (! $payments->isEnabled()) {
            // Configured environments only — keep the surface inert otherwise.
            return response()->json(['received' => false], 503);
        }

        $payload = (string) $request->getContent();
        $signature = (string) $request->header('Stripe-Signature', '');

        try {
            $payments->handleWebhook($payload, $signature);
        } catch (UnexpectedValueException $e) {
            // Malformed payload.
            Log::warning('Stripe webhook payload invalid', ['error' => $e->getMessage()]);

            return response()->json(['received' => false], 400);
        } catch (RuntimeException $e) {
            // Signature mismatch (Stripe\Exception\SignatureVerificationException extends RuntimeException).
            Log::warning('Stripe webhook signature mismatch', ['error' => $e->getMessage()]);

            return response()->json(['received' => false], 400);
        }

        return response()->json(['received' => true]);
    }
}
