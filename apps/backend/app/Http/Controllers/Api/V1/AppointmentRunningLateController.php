<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AppointmentRunningLateRequest;
use App\Mail\AppointmentRunningLateMail;
use App\Models\Appointment;
use App\Notifications\NotificationEvents;
use App\Services\Notifications\AppointmentNotificationPayload;
use App\Services\Notifications\NotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

final class AppointmentRunningLateController extends Controller
{
    public function __invoke(
        AppointmentRunningLateRequest $request,
        Appointment $appointment,
        NotificationService $notifications,
    ): JsonResponse {
        $this->authorize('notifyRunningLate', $appointment);

        $customer = $appointment->customer;
        if ($customer === null) {
            return response()->json([
                'message' => 'This appointment has no customer to notify.',
            ], 422);
        }

        $minutes = (int) $request->validated('late_by_minutes');
        $appointment->loadMissing(['service', 'barber', 'customer']);

        $headline = $minutes === 1
            ? 'Running about 1 minute late'
            : "Running about {$minutes} minutes late";

        $payload = AppointmentNotificationPayload::build($appointment) + [
            'late_by_minutes' => $minutes,
            'headline' => $headline,
        ];

        $notifications->send(
            $customer,
            NotificationEvents::APPOINTMENT_RUNNING_LATE,
            $payload,
            mail: new AppointmentRunningLateMail($appointment, $minutes, $headline),
        );

        return response()->json([
            'sent' => true,
            'sent_at' => CarbonImmutable::now()->toIso8601String(),
        ]);
    }
}
