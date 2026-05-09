<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Notifications\AppointmentReminderService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentReminderController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        AppointmentReminderService $reminders,
    ): JsonResponse {
        $this->authorize('sendReminder', $appointment);

        $sent = $reminders->dispatchManual($appointment, CarbonImmutable::now());

        if (! $sent) {
            return response()->json([
                'message' => 'Reminder could not be sent for this appointment.',
            ], 422);
        }

        return response()->json([
            'sent' => true,
            'sent_at' => CarbonImmutable::now()->toIso8601String(),
        ]);
    }
}
