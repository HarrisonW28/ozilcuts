<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\BarberProfileResource;
use App\Models\BarberProfile;
use App\Models\Role;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class BarberIndexController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        $items = BarberProfile::query()
            ->where('is_published', true)
            ->whereHas('user.role', fn ($q) => $q->where('slug', Role::SLUG_BARBER))
            ->with(['user'])
            ->get()
            ->sortBy(fn (BarberProfile $profile) => $profile->user->name)
            ->values();

        return BarberProfileResource::collection($items);
    }
}
