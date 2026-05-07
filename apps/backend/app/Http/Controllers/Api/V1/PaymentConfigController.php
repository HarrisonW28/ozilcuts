<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;

final class PaymentConfigController extends Controller
{
    public function __invoke(PaymentService $payments): JsonResponse
    {
        return response()->json([
            'enabled' => $payments->isEnabled(),
            'publishable_key' => (string) config('services.stripe.publishable', '') ?: null,
            'currency' => $payments->currency(),
        ]);
    }
}
