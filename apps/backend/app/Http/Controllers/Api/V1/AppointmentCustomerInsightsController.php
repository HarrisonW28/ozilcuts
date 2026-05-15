<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Services\Reports\CustomerAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentCustomerInsightsController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        CustomerAnalyticsService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $this->authorize('view', $appointment);

        $isAssignedBarber = $appointment->barber_user_id === $user->id;
        if (! $user->isAdmin() && ! $isAssignedBarber) {
            abort(403);
        }

        if ($appointment->customer_user_id === null) {
            return response()->json([
                'linked_customer' => false,
            ]);
        }

        $appointment->loadMissing('customer');
        $customer = $appointment->customer;
        if ($customer === null) {
            return response()->json([
                'linked_customer' => false,
            ]);
        }

        $customer->loadMissing(['customerProfile', 'hairProfile']);

        $summary = $service->forCustomer($customer);
        $visitsWithThisBarber = $service->visitsWithBarberCount(
            (int) $customer->id,
            (int) $appointment->barber_user_id,
        );

        $preferred = $summary['preferred_barber'] ?? null;
        $prefersYou = is_array($preferred)
            && (int) ($preferred['user_id'] ?? 0) === (int) $appointment->barber_user_id;

        $prefsRaw = $customer->customerProfile?->preferences;
        $bookingPreferencesNote = is_string($prefsRaw) && trim($prefsRaw) !== ''
            ? trim($prefsRaw)
            : null;

        $history = $service->historyPreviewForCustomer($customer, (int) $appointment->id, 5);

        return response()->json([
            'linked_customer' => true,
            'recognition_tier' => $service->recognitionTierFor($summary),
            'prefers_you' => $prefersYou,
            'summary' => $summary,
            'visits_with_this_barber' => $visitsWithThisBarber,
            'favorite_services' => $service->favoriteServicesForCustomer($customer, 5),
            'history_preview' => AppointmentResource::collection($history)->resolve($request),
            'booking_preferences_note' => $bookingPreferencesNote,
            'hair_preferences' => $service->hairPreferencesSnapshotFor($customer),
        ]);
    }
}
