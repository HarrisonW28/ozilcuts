<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Services\Customers\CustomerRelationshipService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerSelfRelationshipController extends Controller
{
    public function __invoke(
        Request $request,
        CustomerRelationshipService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }

        if (! $viewer->hasRole(Role::SLUG_CUSTOMER)) {
            abort(403);
        }

        return response()->json([
            'data' => $service->forCustomer($viewer, CarbonImmutable::now(), staffView: false),
        ]);
    }
}
