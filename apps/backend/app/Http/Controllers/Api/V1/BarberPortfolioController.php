<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\HaircutPhotoResource;
use App\Models\BarberProfile;
use App\Models\HaircutPhoto;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BarberPortfolioController extends Controller
{
    public function __invoke(Request $request, User $user): JsonResponse
    {
        $isPublishedBarber = BarberProfile::query()
            ->where('user_id', $user->id)
            ->where('is_published', true)
            ->whereHas('user.role', fn ($q) => $q->where('slug', Role::SLUG_BARBER))
            ->exists();

        if (! $isPublishedBarber) {
            abort(404);
        }

        $perPage = max(1, min(48, (int) $request->integer('per_page', 24)));

        $page = HaircutPhoto::query()
            ->publiclyVisible()
            ->whereHas('appointment', fn ($q) => $q->where('barber_user_id', $user->id))
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'data' => HaircutPhotoResource::collection($page->items())->toArray($request),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }
}
