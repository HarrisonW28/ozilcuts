<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AppointmentMessageReadRequest;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentMessageService;
use Illuminate\Http\JsonResponse;

final class AppointmentMessageReadController extends Controller
{
    public function __invoke(
        AppointmentMessageReadRequest $request,
        Appointment $appointment,
        AppointmentMessageService $messages,
    ): JsonResponse {
        $this->authorize('markMessagesRead', $appointment);

        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $id = (int) $request->validated('last_read_message_id');
        $messages->markRead($appointment, $user, $id);

        return response()->json(['ok' => true]);
    }
}
