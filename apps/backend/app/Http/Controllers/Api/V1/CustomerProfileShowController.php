<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerProfileResource;
use App\Services\Customers\CustomerProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

final class CustomerProfileShowController extends Controller
{
    public function __invoke(Request $request, CustomerProfileService $profiles): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        try {
            $profile = $profiles->findOrCreateFor($user);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        $profile->load(['user', 'preferredBarber']);

        return response()->json((new CustomerProfileResource($profile))->toArray($request));
    }
}
