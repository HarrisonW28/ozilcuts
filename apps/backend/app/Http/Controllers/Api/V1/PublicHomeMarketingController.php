<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Marketing\ShopMarketingService;
use Illuminate\Http\JsonResponse;

final class PublicHomeMarketingController extends Controller
{
    public function __invoke(ShopMarketingService $marketing): JsonResponse
    {
        return response()->json([
            'data' => $marketing->publicHomeMarketing(),
        ]);
    }
}
