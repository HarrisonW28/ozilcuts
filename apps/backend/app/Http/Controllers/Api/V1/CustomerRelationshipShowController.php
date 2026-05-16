<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Customers\CustomerRelationshipService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerRelationshipShowController extends Controller
{
    public function __invoke(
        Request $request,
        User $user,
        CustomerRelationshipService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }

        $service->assertStaffViewer($viewer);
        $service->assertCustomer($user);

        return response()->json([
            'data' => $service->forCustomer($user, CarbonImmutable::now(), staffView: true),
        ]);
    }
}
