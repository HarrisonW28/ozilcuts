<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Security\ProductionReadinessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AdminProductionSecurityController extends Controller
{
    public function __invoke(
        Request $request,
        ProductionReadinessService $readiness,
    ): JsonResponse {
        if ($request->user() === null || ! $request->user()->isAdmin()) {
            abort(403);
        }

        return response()->json([
            'data' => $readiness->review(),
        ]);
    }
}
