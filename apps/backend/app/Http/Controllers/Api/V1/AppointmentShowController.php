<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentShowController extends Controller
{
    public function __invoke(Request $request, Appointment $appointment): JsonResponse
    {
        $this->authorize('view', $appointment);

        $appointment->load(['service', 'barber', 'customer']);

        return response()->json(
            (new AppointmentResource($appointment))->toArray($request),
        );
    }
}
