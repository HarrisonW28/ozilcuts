<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCustomerPrivacyRequest;
use App\Services\Customers\CustomerPrivacyService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class CustomerPrivacyUpdateController extends Controller
{
    public function __invoke(
        UpdateCustomerPrivacyRequest $request,
        CustomerPrivacyService $privacy,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        try {
            $data = $privacy->updateControls($user, $request->validated());
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json(['data' => $data]);
    }
}
