<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentOperationalCommunicationAssistService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentOperationalCommunicationAssistController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        AppointmentOperationalCommunicationAssistService $assist,
    ): JsonResponse {
        $this->authorize('viewMessages', $appointment);

        if ($request->user() === null) {
            abort(401);
        }

        return response()->json($assist->build($appointment, $request->user()));
    }
}
