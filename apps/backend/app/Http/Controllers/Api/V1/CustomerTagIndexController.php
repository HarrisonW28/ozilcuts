<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerTagResource;
use App\Models\User;
use App\Services\Customers\CustomerTagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

final class CustomerTagIndexController extends Controller
{
    public function __invoke(
        Request $request,
        User $user,
        CustomerTagService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }

        $this->authorize('viewStaffCrm', $user);

        try {
            $tags = $service->listFor($user);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'data' => CustomerTagResource::collection($tags)->toArray($request),
        ]);
    }
}
