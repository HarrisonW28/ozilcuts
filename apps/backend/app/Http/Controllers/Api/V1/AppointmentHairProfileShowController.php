<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\HairProfileResource;
use App\Models\Appointment;
use App\Services\Customers\HairProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentHairProfileShowController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        HairProfileService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $isAssignedBarber = $appointment->barber_user_id === $user->id;
        if (! $user->isAdmin() && ! $isAssignedBarber) {
            abort(403);
        }

        $appointment->loadMissing('customer');
        $customer = $appointment->customer;
        if ($customer === null) {
            return response()->json(['message' => 'Customer not found.'], 404);
        }

        $profile = $service->findForUser($customer);
        if ($profile === null) {
            return response()->json(['data' => null]);
        }

        $profile->load(['photos', 'user']);

        return response()->json([
            'data' => (new HairProfileResource($profile))->toArray($request),
        ]);
    }
}
