<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\BarberAnalyticsRequest;
use App\Services\Reports\BarberAnalyticsService;
use Illuminate\Http\JsonResponse;

final class BarberAnalyticsCompareController extends Controller
{
    public function __invoke(
        BarberAnalyticsRequest $request,
        BarberAnalyticsService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }
        if (! $viewer->isAdmin()) {
            abort(403);
        }

        $from = $request->from();
        $to = $request->to();

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'rows' => $service->compare($from, $to),
        ]);
    }
}
