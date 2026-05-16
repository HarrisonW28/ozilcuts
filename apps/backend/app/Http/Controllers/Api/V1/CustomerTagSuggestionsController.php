<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Customers\CustomerTagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerTagSuggestionsController extends Controller
{
    public function __invoke(
        Request $request,
        CustomerTagService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        if (! $user->can('useStaffCrmTools')) {
            abort(403);
        }

        $query = $request->query('q');
        if (is_string($query) && mb_strlen($query) > 64) {
            $query = mb_substr($query, 0, 64);
        }
        $suggestions = $service->suggestions(
            is_string($query) ? $query : null,
            (int) $request->integer('limit', 12),
        );

        return response()->json(['data' => $suggestions]);
    }
}
