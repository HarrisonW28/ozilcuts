<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateShopInstagramRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Marketing\ShopMarketingService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;

final class AdminShopInstagramUpdateController extends Controller
{
    public function __invoke(
        UpdateShopInstagramRequest $request,
        ShopMarketingService $marketing,
        AuditLogService $audit,
    ): JsonResponse {
        /** @var User $admin */
        $admin = $request->user();

        $handle = $request->validated('instagram_handle');
        $normalized = is_string($handle) ? $handle : null;

        $updated = $marketing->updateInstagramHandle($admin, $normalized);

        $audit->record(
            action: AuditAction::SHOP_ONBOARDING_UPDATED,
            actor: $admin,
            request: $request,
            subjectType: 'user',
            subjectId: $admin->id,
            metadata: ['fields' => ['shop_instagram_handle']],
        );

        return response()->json((new UserResource($updated))->toArray($request));
    }
}
