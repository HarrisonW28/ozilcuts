<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Marketing\ShopMarketingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AdminShopLogoDestroyController extends Controller
{
    public function __invoke(Request $request, ShopMarketingService $marketing): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $updated = $marketing->clearLogo($admin);

        return response()->json((new UserResource($updated))->toArray($request));
    }
}
