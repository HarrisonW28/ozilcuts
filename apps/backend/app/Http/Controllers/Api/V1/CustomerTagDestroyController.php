<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CustomerTag;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Customers\CustomerTagService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerTagDestroyController extends Controller
{
    public function __invoke(
        Request $request,
        CustomerTag $tag,
        CustomerTagService $service,
        AuditLogService $audit,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $customer = User::query()->findOrFail($tag->customer_user_id);
        $this->authorize('manageStaffCrm', $customer);

        $audit->record(
            action: AuditAction::CUSTOMER_TAG_DELETED,
            actor: $user,
            request: $request,
            subjectType: 'customer_tag',
            subjectId: $tag->id,
            targetUserId: $customer->id,
            metadata: ['label' => $tag->label],
        );

        $service->detach($tag);

        return response()->json(['deleted' => true]);
    }
}
