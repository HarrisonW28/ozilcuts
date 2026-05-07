<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

final class AppointmentCalendarLinkController extends Controller
{
    public function __invoke(Request $request, Appointment $appointment): JsonResponse
    {
        $this->authorize('view', $appointment);

        $url = URL::temporarySignedRoute(
            'appointments.calendar',
            now()->addHour(),
            ['appointment' => $appointment->id],
        );

        return response()->json([
            'url' => $url,
            'expires_in_seconds' => 3600,
        ]);
    }
}
