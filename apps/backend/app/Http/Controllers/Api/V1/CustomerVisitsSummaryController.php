<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Models\Role;
use App\Services\Reports\CustomerAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerVisitsSummaryController extends Controller
{
    public function __invoke(
        Request $request,
        CustomerAnalyticsService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }
        if (! $viewer->hasRole(Role::SLUG_CUSTOMER)) {
            abort(403);
        }

        $history = $service->historyForCustomer($viewer);

        return response()->json([
            'summary' => $service->forCustomer($viewer),
            'history' => AppointmentResource::collection($history)->resolve($request),
        ]);
    }
}
