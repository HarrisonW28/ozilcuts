<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\ReplaceBarberAvailabilityRequest;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Availability\BarberAvailabilityService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;

final class BarberAvailabilityManageReplaceController extends Controller
{
    public function __invoke(
        ReplaceBarberAvailabilityRequest $request,
        User $user,
        BarberAvailabilityService $availability,
        AuditLogService $audit,
    ): JsonResponse {
        $profile = $user->barberProfile;
        if ($profile === null) {
            abort(404);
        }

        /** @var list<array{weekday: int, starts_at: string, ends_at: string}> $windows */
        $windows = collect($request->validated('windows'))
            ->map(fn (array $w): array => [
                'weekday' => (int) $w['weekday'],
                'starts_at' => $w['starts_at'],
                'ends_at' => $w['ends_at'],
            ])
            ->all();

        $availability->replace($profile, $windows);

        $audit->record(
            action: AuditAction::BARBER_AVAILABILITY_REPLACED,
            actor: $request->user(),
            request: $request,
            subjectType: 'barber_profile',
            subjectId: $profile->id,
            targetUserId: $user->id,
            metadata: ['window_count' => count($windows)],
        );

        return response()->json([
            'weekdays' => $availability->groupedForProfile($profile->fresh()),
        ]);
    }
}
