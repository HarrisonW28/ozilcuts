<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Service;
use App\Models\User;
use App\Services\Booking\SmartSlotRecommendationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BarberSmartSlotHintsController extends Controller
{
    public function __invoke(
        Request $request,
        User $user,
        SmartSlotRecommendationService $hints,
    ): JsonResponse {
        $data = $request->validate([
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $user->loadMissing('role');
        if (! $user->hasRole(Role::SLUG_BARBER)) {
            abort(404);
        }

        $serviceRow = Service::query()->where('is_active', true)->find($data['service_id']);
        if ($serviceRow === null) {
            return response()->json([
                'date' => $data['date'],
                'service_id' => (int) $data['service_id'],
                'barber_user_id' => (int) $user->id,
                'personalized' => false,
                'preferred_time_windows' => [],
                'affinity' => null,
                'repeat_booking' => null,
                'cancellation_match' => [
                    'recent_cancellations_on_day' => 0,
                    'hint' => null,
                ],
            ]);
        }

        $date = CarbonImmutable::createFromFormat('Y-m-d', $data['date'])->startOfDay();
        $viewer = $request->user();
        if ($viewer !== null) {
            $viewer->loadMissing('role');
        }

        return response()->json(
            $hints->forBarberServiceDate($user, $serviceRow, $date, $viewer),
        );
    }
}
