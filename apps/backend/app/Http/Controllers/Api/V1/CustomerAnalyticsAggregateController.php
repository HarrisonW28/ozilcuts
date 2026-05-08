<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerAnalyticsRequest;
use App\Services\Reports\CustomerAnalyticsService;
use Illuminate\Http\JsonResponse;

final class CustomerAnalyticsAggregateController extends Controller
{
    public function __invoke(
        CustomerAnalyticsRequest $request,
        CustomerAnalyticsService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }
        if (! $viewer->isAdmin()) {
            abort(403);
        }

        return response()->json($service->aggregate($request->from(), $request->to()));
    }
}
