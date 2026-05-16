<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Customers\CustomerPrivacyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerPrivacyShowController extends Controller
{
    public function __invoke(
        Request $request,
        CustomerPrivacyService $privacy,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        return response()->json([
            'data' => $privacy->snapshot($user),
        ]);
    }
}
