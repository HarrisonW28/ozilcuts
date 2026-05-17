<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreShopHeroPosterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Marketing\ShopMarketingService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;

final class AdminShopHeroPosterStoreController extends Controller
{
    public function __invoke(
        StoreShopHeroPosterRequest $request,
        ShopMarketingService $marketing,
        AuditLogService $audit,
    ): JsonResponse {
        /** @var User $admin */
        $admin = $request->user();

        $variant = $request->heroVariant();
        $updated = $marketing->storeHeroPoster($admin, $request->file('poster'), $variant);

        $audit->record(
            action: AuditAction::SHOP_ONBOARDING_UPDATED,
            actor: $admin,
            request: $request,
            subjectType: 'user',
            subjectId: $admin->id,
            metadata: [
                'fields' => [
                    $variant === ShopMarketingService::HERO_VARIANT_MOBILE
                        ? 'shop_hero_poster_mobile_path'
                        : 'shop_hero_poster_path',
                ],
            ],
        );

        return response()->json((new UserResource($updated))->toArray($request));
    }
}
