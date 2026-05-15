<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateAppointmentArrivalRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentMessageService;
use App\Services\Appointments\ArrivalPresenceNotificationService;
use Illuminate\Http\JsonResponse;

final class AppointmentArrivalUpdateController extends Controller
{
    public function __invoke(
        UpdateAppointmentArrivalRequest $request,
        Appointment $appointment,
        AppointmentMessageService $messages,
        ArrivalPresenceNotificationService $presence,
    ): JsonResponse {
        $next = (string) $request->validated('arrival_state');
        $this->authorize('updateArrival', [$appointment, $next]);

        $previous = (string) $appointment->arrival_state;
        $appointment->arrival_state = $next;
        $appointment->save();

        $user = $request->user();
        if ($user !== null) {
            $messages->recordArrivalStateTransition($appointment, $user, $previous, $next);
        }

        if (
            $previous === Appointment::ARRIVAL_EXPECTED
            && $next === Appointment::ARRIVAL_ARRIVED
        ) {
            $presence->guestCheckedIn($appointment);
        }

        $appointment->load(['service', 'barber', 'customer']);

        return response()->json(
            (new AppointmentResource($appointment))->toArray($request),
        );
    }
}
