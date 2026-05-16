<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Services\Reports\ShopOperationalIntelligenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ShopOperationalIntelligenceController extends Controller
{
    public function __invoke(
        Request $request,
        ShopOperationalIntelligenceService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }

        if (! $viewer->hasRole(Role::SLUG_BARBER) && ! $viewer->isAdmin()) {
            abort(403);
        }

        return response()->json([
            'data' => $service->liveSnapshot(),
        ]);
    }
}
