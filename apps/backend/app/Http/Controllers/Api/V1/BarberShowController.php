<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\BarberProfileResource;
use App\Models\BarberProfile;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BarberShowController extends Controller
{
    public function __invoke(Request $request, User $user): JsonResponse
    {
        $profile = BarberProfile::query()
            ->where('user_id', $user->id)
            ->where('is_published', true)
            ->whereHas('user.role', fn ($q) => $q->where('slug', Role::SLUG_BARBER))
            ->with(['user'])
            ->first();

        if ($profile === null) {
            abort(404);
        }

        return response()->json((new BarberProfileResource($profile))->toArray($request));
    }
}
