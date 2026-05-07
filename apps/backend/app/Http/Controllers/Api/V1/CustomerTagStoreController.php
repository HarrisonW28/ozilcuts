<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerTagRequest;
use App\Http\Resources\CustomerTagResource;
use App\Models\User;
use App\Services\Customers\CustomerTagService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class CustomerTagStoreController extends Controller
{
    public function __invoke(
        StoreCustomerTagRequest $request,
        User $user,
        CustomerTagService $service,
    ): JsonResponse {
        $author = $request->user();
        if ($author === null) {
            abort(401);
        }

        try {
            $tag = $service->attach($user, $author, (string) $request->input('label'));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(
            (new CustomerTagResource($tag))->toArray($request),
            $tag->wasRecentlyCreated ? 201 : 200,
        );
    }
}
