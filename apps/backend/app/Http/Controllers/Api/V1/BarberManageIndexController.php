<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\BarberManageResource;
use App\Models\BarberProfile;
use App\Models\Role;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class BarberManageIndexController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', BarberProfile::class);

        return BarberManageResource::collection(
            BarberProfile::query()
                ->with(['user'])
                ->whereHas('user.role', fn ($q) => $q->where('slug', Role::SLUG_BARBER))
                ->orderByDesc('updated_at')
                ->paginate(15),
        );
    }
}
