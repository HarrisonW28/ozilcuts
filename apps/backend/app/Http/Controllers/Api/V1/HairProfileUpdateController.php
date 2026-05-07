<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateHairProfileRequest;
use App\Http\Resources\HairProfileResource;
use App\Services\Customers\HairProfileService;
use Illuminate\Http\JsonResponse;

final class HairProfileUpdateController extends Controller
{
    public function __invoke(
        UpdateHairProfileRequest $request,
        HairProfileService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $profile = $service->findOrCreateFor($user);
        $profile = $service->update($profile, $request->validated());

        return response()->json((new HairProfileResource($profile))->toArray($request));
    }
}
