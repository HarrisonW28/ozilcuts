<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\UpdateBarberProfileRequest;
use App\Http\Resources\BarberManageResource;
use App\Models\User;
use App\Services\Barbers\BarberManagementService;
use Illuminate\Http\JsonResponse;

final class BarberManageUpdateController extends Controller
{
    public function __invoke(
        UpdateBarberProfileRequest $request,
        User $user,
        BarberManagementService $barbers,
    ): JsonResponse {
        $profile = $barbers->updateProfile($user, $request->validated(), $request->user());

        return response()->json((new BarberManageResource($profile))->toArray($request));
    }
}
