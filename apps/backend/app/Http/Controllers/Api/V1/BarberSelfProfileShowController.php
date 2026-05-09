<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\BarberProfileResource;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BarberSelfProfileShowController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user === null || ! $user->hasRole(Role::SLUG_BARBER)) {
            abort(403);
        }

        $user->loadMissing('role');
        $profile = $user->barberProfile;
        if ($profile === null) {
            abort(404);
        }

        $profile->load('user');

        return response()->json((new BarberProfileResource($profile))->toArray($request));
    }
}
