<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\UpdateBarberProfileRequest;
use App\Http\Resources\BarberManageResource;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Barbers\BarberManagementService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;

final class BarberManageUpdateController extends Controller
{
    public function __invoke(
        UpdateBarberProfileRequest $request,
        User $user,
        BarberManagementService $barbers,
        AuditLogService $audit,
    ): JsonResponse {
        $actor = $request->user();
        $validated = $request->validated();
        $profile = $barbers->updateProfile($user, $validated, $actor);

        $audit->record(
            action: AuditAction::BARBER_PROFILE_UPDATED,
            actor: $actor,
            request: $request,
            subjectType: 'barber_profile',
            subjectId: $profile->id,
            targetUserId: $user->id,
            metadata: ['fields' => array_keys($validated)],
        );

        return response()->json((new BarberManageResource($profile))->toArray($request));
    }
}
