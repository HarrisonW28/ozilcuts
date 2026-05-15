<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Appointments\QueueWaitIntelligenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentQueueIntelligenceController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        QueueWaitIntelligenceService $queue,
    ): JsonResponse {
        $this->authorize('view', $appointment);

        return response()->json(
            $queue->summarize(
                $appointment,
                null,
                (int) $request->user()->id !== (int) $appointment->customer_user_id,
            ),
        );
    }
}
