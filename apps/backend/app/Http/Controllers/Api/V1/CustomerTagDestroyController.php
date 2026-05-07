<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CustomerTag;
use App\Models\Role;
use App\Services\Customers\CustomerTagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerTagDestroyController extends Controller
{
    public function __invoke(
        Request $request,
        CustomerTag $tag,
        CustomerTagService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        if (! $user->hasRole(Role::SLUG_BARBER) && ! $user->isAdmin()) {
            abort(403);
        }

        $service->detach($tag);

        return response()->json(['deleted' => true]);
    }
}
