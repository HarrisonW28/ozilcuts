<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCustomerVipRequest;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Customers\CustomerRelationshipService;
use App\Support\AuditAction;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

final class CustomerVipUpdateController extends Controller
{
    public function __invoke(
        UpdateCustomerVipRequest $request,
        User $user,
        CustomerRelationshipService $service,
        AuditLogService $audit,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }

        $this->authorize('manageStaffCrm', $user);
        $service->assertCustomer($user);
        $isVip = (bool) $request->validated('is_vip');
        $service->setVip($user, $viewer, $isVip);

        $audit->record(
            action: AuditAction::CUSTOMER_VIP_UPDATED,
            actor: $viewer,
            request: $request,
            subjectType: 'customer_profile',
            subjectId: $user->customerProfile?->id,
            targetUserId: $user->id,
            metadata: ['is_vip' => $isVip],
        );

        return response()->json([
            'data' => $service->forCustomer($user, CarbonImmutable::now(), staffView: true),
        ]);
    }
}
