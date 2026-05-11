<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\StoreBarberRequest;
use App\Http\Resources\BarberManageResource;
use App\Services\Barbers\BarberManagementService;
use Illuminate\Http\JsonResponse;

final class BarberManageStoreController extends Controller
{
    public function __invoke(StoreBarberRequest $request, BarberManagementService $barbers): JsonResponse
    {
        $profile = $barbers->createBarber($request->validated(), $request->user());

        return response()->json(
            (new BarberManageResource($profile))->toArray($request),
            201,
        );
    }
}
