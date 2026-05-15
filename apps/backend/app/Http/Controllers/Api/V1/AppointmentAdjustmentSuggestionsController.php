<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentAdjustmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentAdjustmentSuggestionsController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        AppointmentAdjustmentService $adjustments,
    ): JsonResponse {
        $this->authorize('viewAdjustments', $appointment);

        return response()->json($adjustments->nearbySuggestions($appointment));
    }
}
