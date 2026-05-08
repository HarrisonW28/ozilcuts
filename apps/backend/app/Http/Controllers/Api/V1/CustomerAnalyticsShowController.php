<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Models\Role;
use App\Models\User;
use App\Services\Reports\CustomerAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerAnalyticsShowController extends Controller
{
    public function __invoke(
        Request $request,
        User $user,
        CustomerAnalyticsService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }
        if (! $viewer->isAdmin()) {
            abort(403);
        }
        if (! $user->hasRole(Role::SLUG_CUSTOMER)) {
            abort(404);
        }

        $history = $service->historyForCustomer($user);

        return response()->json([
            'summary' => $service->forCustomer($user),
            'history' => AppointmentResource::collection($history)->resolve($request),
        ]);
    }
}
