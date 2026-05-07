<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BarberProfile;
use App\Models\Role;
use App\Models\User;
use App\Services\Availability\BarberAvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BarberAvailabilityPublicController extends Controller
{
    public function __invoke(Request $request, User $user, BarberAvailabilityService $availability): JsonResponse
    {
        $profile = BarberProfile::query()
            ->where('user_id', $user->id)
            ->where('is_published', true)
            ->whereHas('user.role', fn ($q) => $q->where('slug', Role::SLUG_BARBER))
            ->first();

        if ($profile === null) {
            abort(404);
        }

        return response()->json([
            'weekdays' => $availability->groupedForProfile($profile),
        ]);
    }
}
