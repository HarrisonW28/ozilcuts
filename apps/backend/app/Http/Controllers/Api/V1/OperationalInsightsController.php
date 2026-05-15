<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\OperationalInsightsRequest;
use App\Services\Reports\OperationalAiInsightsService;
use App\Services\Reports\OperationalInsightsService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

final class OperationalInsightsController extends Controller
{
    public function __invoke(
        OperationalInsightsRequest $request,
        OperationalInsightsService $service,
        OperationalAiInsightsService $aiInsights,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }
        if (! $viewer->isAdmin()) {
            abort(403);
        }

        $now = CarbonImmutable::now();
        $from = $request->from();
        $to = $request->to();

        $payload = $service->summary(
            now: $now,
            from: $from,
            to: $to,
        );
        $payload['ai_insights'] = $aiInsights->build($now, $from, $to, $payload);

        return response()->json($payload);
    }
}
