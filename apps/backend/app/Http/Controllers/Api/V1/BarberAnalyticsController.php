<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\BarberAnalyticsRequest;
use App\Models\Role;
use App\Models\User;
use App\Services\Reports\BarberAnalyticsService;
use Illuminate\Http\JsonResponse;

final class BarberAnalyticsController extends Controller
{
    public function __invoke(
        BarberAnalyticsRequest $request,
        User $user,
        BarberAnalyticsService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }
        if ($viewer->id !== $user->id && ! $viewer->isAdmin()) {
            abort(403);
        }
        if (! $user->hasRole(Role::SLUG_BARBER)) {
            abort(404);
        }

        $from = $request->from();
        $to = $request->to();

        return response()->json([
            'summary' => $service->summary($user, $from, $to),
            'top_services' => $service->topServices($user, $from, $to),
            'top_customers' => $service->topCustomers($user, $from, $to),
            'series' => $service->dailySeries($user, $from, $to),
        ]);
    }
}
