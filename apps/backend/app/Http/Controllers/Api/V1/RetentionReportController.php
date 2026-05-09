<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Notifications\SmartRebookNudgeService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RetentionReportController extends Controller
{
    public function __invoke(
        Request $request,
        SmartRebookNudgeService $nudges,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }
        if (! $viewer->isAdmin()) {
            abort(403);
        }

        $snapshot = $nudges->retentionSnapshot(CarbonImmutable::now());

        return response()->json($snapshot);
    }
}
