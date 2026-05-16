<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Audit\AdminSecurityReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AdminSecurityReviewController extends Controller
{
    public function __invoke(Request $request, AdminSecurityReviewService $review): JsonResponse
    {
        if ($request->user() === null || ! $request->user()->isAdmin()) {
            abort(403);
        }

        return response()->json([
            'data' => $review->snapshot(),
        ]);
    }
}
