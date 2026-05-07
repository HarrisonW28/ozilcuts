<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerNoteResource;
use App\Models\Role;
use App\Models\User;
use App\Services\Customers\CustomerNoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

final class CustomerNoteIndexController extends Controller
{
    public function __invoke(
        Request $request,
        User $user,
        CustomerNoteService $service,
    ): JsonResponse {
        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }

        if (! $viewer->hasRole(Role::SLUG_BARBER) && ! $viewer->isAdmin()) {
            abort(403);
        }

        try {
            $notes = $service->listFor($user);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'data' => CustomerNoteResource::collection($notes)->toArray($request),
        ]);
    }
}
