<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentAdjustmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentAdjustmentRequestShowController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        AppointmentAdjustmentService $adjustments,
    ): JsonResponse {
        $this->authorize('viewAdjustments', $appointment);

        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }

        return response()->json($adjustments->pendingPayload($appointment, $viewer));
    }
}
