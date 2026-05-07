<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCustomerProfileRequest;
use App\Http\Resources\CustomerProfileResource;
use App\Services\Customers\CustomerProfileService;
use Illuminate\Http\JsonResponse;

final class CustomerProfileUpdateController extends Controller
{
    public function __invoke(
        UpdateCustomerProfileRequest $request,
        CustomerProfileService $profiles,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $profile = $profiles->findOrCreateFor($user);
        $profile = $profiles->update($profile, $request->validated());

        return response()->json((new CustomerProfileResource($profile))->toArray($request));
    }
}
