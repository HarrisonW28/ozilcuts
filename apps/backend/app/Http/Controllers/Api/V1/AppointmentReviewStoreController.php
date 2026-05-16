<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentReviewResource;
use App\Models\Appointment;
use App\Models\Role;
use App\Services\Barbers\AppointmentReviewService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class AppointmentReviewStoreController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        AppointmentReviewService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        if (! $user->hasRole(Role::SLUG_CUSTOMER)) {
            abort(403);
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', Rule::in([1, 2, 3, 4, 5])],
            'body' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $review = $service->createForAppointment(
            $appointment,
            $user,
            $validated,
            CarbonImmutable::now(),
        );

        $review->load(['customer', 'appointment.service']);

        return response()->json([
            'data' => (new AppointmentReviewResource($review))->toArray($request),
        ], 201);
    }
}
