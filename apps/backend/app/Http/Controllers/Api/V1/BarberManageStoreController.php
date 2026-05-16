<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\StoreBarberRequest;
use App\Http\Resources\BarberManageResource;
use App\Services\Audit\AuditLogService;
use App\Services\Barbers\BarberManagementService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;

final class BarberManageStoreController extends Controller
{
    public function __invoke(
        StoreBarberRequest $request,
        BarberManagementService $barbers,
        AuditLogService $audit,
    ): JsonResponse {
        $actor = $request->user();
        $profile = $barbers->createBarber($request->validated(), $actor);
        $profile->load('user');

        $audit->record(
            action: AuditAction::BARBER_CREATED,
            actor: $actor,
            request: $request,
            subjectType: 'barber_profile',
            subjectId: $profile->id,
            targetUserId: $profile->user_id,
            metadata: [
                'barber_email' => $profile->user?->email,
                'is_published' => $profile->is_published,
            ],
        );

        return response()->json(
            (new BarberManageResource($profile))->toArray($request),
            201,
        );
    }
}
