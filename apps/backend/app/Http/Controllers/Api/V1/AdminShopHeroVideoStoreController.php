<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreShopHeroVideoRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Marketing\ShopMarketingService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;

final class AdminShopHeroVideoStoreController extends Controller
{
    public function __invoke(
        StoreShopHeroVideoRequest $request,
        ShopMarketingService $marketing,
        AuditLogService $audit,
    ): JsonResponse {
        /** @var User $admin */
        $admin = $request->user();

        $updated = $marketing->storeHeroVideo($admin, $request->file('video'));

        $audit->record(
            action: AuditAction::SHOP_ONBOARDING_UPDATED,
            actor: $admin,
            request: $request,
            subjectType: 'user',
            subjectId: $admin->id,
            metadata: ['fields' => ['shop_hero_video_path']],
        );

        return response()->json((new UserResource($updated))->toArray($request));
    }
}
