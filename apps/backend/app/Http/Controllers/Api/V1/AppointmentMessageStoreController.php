<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AppointmentMessageStoreRequest;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentMessageService;
use Illuminate\Http\JsonResponse;

final class AppointmentMessageStoreController extends Controller
{
    public function __invoke(
        AppointmentMessageStoreRequest $request,
        Appointment $appointment,
        AppointmentMessageService $messages,
    ): JsonResponse {
        $this->authorize('sendMessages', $appointment);

        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $validated = $request->validated();
        $kind = (string) $validated['kind'];
        $body = $validated['body'] ?? null;
        $opKey = $validated['operational_key'] ?? null;
        $presetKey = $validated['preset_key'] ?? null;

        $row = $messages->store($appointment, $user, $kind, $body, $opKey, $presetKey);
        $appointment->loadMissing(['customer', 'barber']);

        return response()->json([
            'message' => $messages->formatMessage($appointment, $row),
        ], 201);
    }
}
