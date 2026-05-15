<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAppointmentAdjustmentRequest;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentAdjustmentService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class AppointmentAdjustmentRequestStoreController extends Controller
{
    public function __invoke(
        StoreAppointmentAdjustmentRequest $request,
        Appointment $appointment,
        AppointmentAdjustmentService $adjustments,
    ): JsonResponse {
        $this->authorize('requestAdjustment', $appointment);

        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        try {
            $row = $adjustments->createRequest(
                $appointment,
                $user,
                CarbonImmutable::parse((string) $request->validated('starts_at')),
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $row->load(['appointment', 'requestedBy.role']);

        return response()->json([
            'request' => $adjustments->pendingPayload($appointment, $user)['request'],
        ], 201);
    }
}
