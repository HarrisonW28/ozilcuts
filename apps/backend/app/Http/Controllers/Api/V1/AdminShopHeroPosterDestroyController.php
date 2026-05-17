<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Marketing\ShopMarketingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class AdminShopHeroPosterDestroyController extends Controller
{
    public function __invoke(Request $request, ShopMarketingService $marketing): JsonResponse
    {
        $validated = $request->validate([
            'variant' => ['sometimes', 'nullable', 'string', Rule::in(['desktop', 'mobile'])],
        ]);

        /** @var User $admin */
        $admin = $request->user();

        $variant = isset($validated['variant']) && is_string($validated['variant'])
            ? $validated['variant']
            : null;

        $updated = $marketing->clearHeroPoster($admin, $variant);

        return response()->json((new UserResource($updated))->toArray($request));
    }
}
