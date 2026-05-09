<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;

final class PaymentConfigController extends Controller
{
    public function __invoke(PaymentService $payments): JsonResponse
    {
        $tapToPay = config('services.stripe.tap_to_pay_status', 'foundation');
        $tapToPay = is_string($tapToPay) ? strtolower($tapToPay) : 'foundation';
        if (! in_array($tapToPay, ['off', 'foundation', 'live'], true)) {
            $tapToPay = 'foundation';
        }

        return response()->json([
            'enabled' => $payments->isEnabled(),
            'publishable_key' => (string) config('services.stripe.publishable', '') ?: null,
            'currency' => $payments->currency(),
            'tap_to_pay_status' => $tapToPay,
        ]);
    }
}
