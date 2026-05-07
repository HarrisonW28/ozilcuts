<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\RebookSuggestionResource;
use App\Models\Appointment;
use App\Services\Booking\RebookSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentRebookHintController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        RebookSuggestionService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $isCustomer = $appointment->customer_user_id === $user->id;
        if (! $isCustomer && ! $user->isAdmin()) {
            abort(403);
        }

        $hint = $service->forAppointment($appointment);
        if ($hint === null) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => (new RebookSuggestionResource($hint))->toArray($request),
        ]);
    }
}
