<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCustomerVipRequest;
use App\Models\User;
use App\Services\Customers\CustomerRelationshipService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

final class CustomerVipUpdateController extends Controller
{
    public function __invoke(
        UpdateCustomerVipRequest $request,
        User $user,
        CustomerRelationshipService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }

        $service->assertCustomer($user);
        $service->setVip($user, $viewer, (bool) $request->validated('is_vip'));

        return response()->json([
            'data' => $service->forCustomer($user, CarbonImmutable::now(), staffView: true),
        ]);
    }
}
