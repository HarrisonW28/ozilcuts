<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class AppointmentIndexController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $query = Appointment::query()
            ->with(['service', 'barber', 'customer'])
            ->orderBy('starts_at');

        if ($user->isAdmin()) {
            // No additional scope.
        } elseif ($user->hasRole(Role::SLUG_BARBER)) {
            $query->where('barber_user_id', $user->id);
        } else {
            $query->where('customer_user_id', $user->id);
        }

        return AppointmentResource::collection($query->paginate(20));
    }
}
