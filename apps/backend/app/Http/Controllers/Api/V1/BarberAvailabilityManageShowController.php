<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Availability\BarberAvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BarberAvailabilityManageShowController extends Controller
{
    public function __invoke(Request $request, User $user, BarberAvailabilityService $availability): JsonResponse
    {
        $profile = $user->barberProfile;
        if ($profile === null) {
            abort(404);
        }

        $this->authorize('update', $profile);

        return response()->json([
            'weekdays' => $availability->groupedForProfile($profile),
        ]);
    }
}
