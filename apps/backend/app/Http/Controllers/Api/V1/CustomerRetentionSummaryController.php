<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\RebookSuggestionResource;
use App\Models\Role;
use App\Services\Customers\CustomerRetentionSummaryService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerRetentionSummaryController extends Controller
{
    public function __invoke(
        Request $request,
        CustomerRetentionSummaryService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        if (! $user->hasRole(Role::SLUG_CUSTOMER)) {
            abort(403);
        }

        $summary = $service->forCustomer($user, CarbonImmutable::now());
        $rebook = $summary['rebook'];
        unset($summary['rebook']);

        return response()->json([
            'data' => array_merge($summary, [
                'rebook' => $rebook === null
                    ? null
                    : (new RebookSuggestionResource($rebook))->toArray($request),
            ]),
        ]);
    }
}
