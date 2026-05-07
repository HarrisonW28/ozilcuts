<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class UserShowController extends Controller
{
    public function __invoke(Request $request, User $user): JsonResponse
    {
        $this->authorize('view', $user);

        $user->load('role');

        return response()->json((new UserResource($user))->toArray($request));
    }
}
