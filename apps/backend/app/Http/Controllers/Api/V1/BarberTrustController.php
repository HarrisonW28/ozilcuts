<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BarberProfile;
use App\Models\Role;
use App\Models\User;
use App\Services\Barbers\BarberTrustService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

final class BarberTrustController extends Controller
{
    public function __invoke(User $user, BarberTrustService $service): JsonResponse
    {
        $isPublished = BarberProfile::query()
            ->where('user_id', $user->id)
            ->where('is_published', true)
            ->whereHas(
                'user.role',
                fn ($q) => $q->where('slug', Role::SLUG_BARBER),
            )
            ->exists();

        if (! $isPublished) {
            abort(404);
        }

        return response()->json([
            'data' => $service->forBarber($user, CarbonImmutable::now()),
        ]);
    }
}
