<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\HairProfileResource;
use App\Services\Customers\HairProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

final class HairProfileShowController extends Controller
{
    public function __invoke(Request $request, HairProfileService $service): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        try {
            $profile = $service->findOrCreateFor($user);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        $profile->load(['photos', 'user']);

        return response()->json((new HairProfileResource($profile))->toArray($request));
    }
}
