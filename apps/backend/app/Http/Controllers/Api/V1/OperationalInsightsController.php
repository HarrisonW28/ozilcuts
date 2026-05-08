<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\OperationalInsightsRequest;
use App\Services\Reports\OperationalInsightsService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

final class OperationalInsightsController extends Controller
{
    public function __invoke(
        OperationalInsightsRequest $request,
        OperationalInsightsService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }
        if (! $viewer->isAdmin()) {
            abort(403);
        }

        $payload = $service->summary(
            now: CarbonImmutable::now(),
            from: $request->from(),
            to: $request->to(),
        );

        return response()->json($payload);
    }
}
