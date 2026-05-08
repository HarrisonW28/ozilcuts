<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateNotificationPreferencesRequest;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\JsonResponse;

final class NotificationPreferenceUpdateController extends Controller
{
    public function __invoke(
        UpdateNotificationPreferencesRequest $request,
        NotificationService $notifications,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        /** @var list<array{event_key: string, channel: string, enabled: bool}> $matrix */
        $matrix = (array) $request->validated('preferences');
        $notifications->setPreferences($user, $matrix);

        return response()->json([
            'preferences' => $notifications->preferences($user),
        ]);
    }
}
