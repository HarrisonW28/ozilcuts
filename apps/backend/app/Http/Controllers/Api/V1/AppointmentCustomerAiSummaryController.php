<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentCustomerAiSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentCustomerAiSummaryController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        AppointmentCustomerAiSummaryService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $this->authorize('view', $appointment);

        $isAssignedBarber = $appointment->barber_user_id === $user->id;
        if (! $user->isAdmin() && ! $isAssignedBarber) {
            abort(403);
        }

        return response()->json($service->summarize($appointment));
    }
}
