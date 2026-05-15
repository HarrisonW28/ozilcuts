<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportAppointmentArrivalProximityRequest;
use App\Models\Appointment;
use App\Services\Appointments\ArrivalProximityService;
use App\Services\Customers\CustomerProfileService;
use Illuminate\Http\JsonResponse;

final class AppointmentArrivalProximityController extends Controller
{
    public function __invoke(
        ReportAppointmentArrivalProximityRequest $request,
        Appointment $appointment,
        ArrivalProximityService $proximity,
        CustomerProfileService $profiles,
    ): JsonResponse {
        $this->authorize('reportArrivalProximity', $appointment);

        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $profile = $profiles->findOrCreateFor($user);
        if (! $profile->arrival_location_opt_in) {
            abort(403, 'Turn on arrival location sharing in your profile to use this.');
        }

        $lat = round((float) $request->validated('lat'), 4);
        $lng = round((float) $request->validated('lng'), 4);

        $result = $proximity->recordPing($appointment, $user, $lat, $lng);

        return response()->json($result);
    }
}
