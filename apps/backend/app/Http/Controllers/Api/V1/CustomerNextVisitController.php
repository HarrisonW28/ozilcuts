<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\RebookSuggestionResource;
use App\Models\Role;
use App\Services\Booking\RebookSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerNextVisitController extends Controller
{
    public function __invoke(
        Request $request,
        RebookSuggestionService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        if (! $user->hasRole(Role::SLUG_CUSTOMER)) {
            abort(403);
        }

        $hint = $service->nextVisitFor($user);
        if ($hint === null) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => (new RebookSuggestionResource($hint))->toArray($request),
        ]);
    }
}
