<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\Role;
use Carbon\CarbonImmutable;
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

        $filters = $request->validate([
            'status' => ['sometimes', 'in:confirmed,cancelled,all'],
            'range' => ['sometimes', 'in:upcoming,past,all'],
        ]);

        $query = Appointment::query()->with(['service', 'barber', 'customer']);

        if ($user->isAdmin()) {
            // No additional scope.
        } elseif ($user->hasRole(Role::SLUG_BARBER)) {
            $query->where('barber_user_id', $user->id);
        } else {
            $query->where('customer_user_id', $user->id);
        }

        $status = $filters['status'] ?? 'all';
        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $range = $filters['range'] ?? 'all';
        $now = CarbonImmutable::now()->toDateTimeString();
        if ($range === 'upcoming') {
            $query->where('starts_at', '>=', $now)->orderBy('starts_at');
        } elseif ($range === 'past') {
            $query->where('starts_at', '<', $now)->orderByDesc('starts_at');
        } else {
            $query->orderBy('starts_at');
        }

        return AppointmentResource::collection($query->paginate(20));
    }
}
