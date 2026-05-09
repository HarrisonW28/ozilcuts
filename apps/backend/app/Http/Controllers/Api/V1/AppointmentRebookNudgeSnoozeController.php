<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SnoozeRebookNudgeRequest;
use App\Models\Appointment;
use App\Services\Notifications\SmartRebookNudgeService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

final class AppointmentRebookNudgeSnoozeController extends Controller
{
    public function __invoke(
        SnoozeRebookNudgeRequest $request,
        Appointment $appointment,
        SmartRebookNudgeService $service,
    ): JsonResponse {
        $this->authorize('snoozeRebookNudge', $appointment);

        $row = $service->snooze($appointment, $request->days(), CarbonImmutable::now());

        return response()->json([
            'state' => $row->state,
            'snooze_until' => $row->snooze_until?->toIso8601String(),
        ]);
    }
}
