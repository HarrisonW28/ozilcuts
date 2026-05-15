<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentAdjustmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

final class AppointmentAdjustmentRequestWithdrawController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        AppointmentAdjustmentService $adjustments,
    ): JsonResponse {
        $this->authorize('viewAdjustments', $appointment);

        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $pending = $adjustments->findPending($appointment);
        if ($pending === null) {
            return response()->json(['message' => 'No pending move request.'], 404);
        }

        try {
            $adjustments->withdraw($pending, $user);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['request' => null]);
    }
}
