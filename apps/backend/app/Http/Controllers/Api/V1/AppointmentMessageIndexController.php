<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentMessageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentMessageIndexController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        AppointmentMessageService $messages,
    ): JsonResponse {
        $this->authorize('viewMessages', $appointment);

        $viewer = $request->user();
        if ($viewer === null) {
            abort(401);
        }

        $after = $request->query('after');
        $afterId = is_numeric($after) ? (int) $after : null;

        $payload = $messages->listForViewer($appointment, $viewer, $afterId);

        return response()->json($payload);
    }
}
