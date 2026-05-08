<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class NotificationMarkReadController extends Controller
{
    public function __invoke(
        Request $request,
        Notification $notification,
        NotificationService $notifications,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }
        if ((int) $notification->user_id !== (int) $user->id) {
            abort(403);
        }

        $updated = $notifications->markRead($notification);

        return response()->json(
            (new NotificationResource($updated))->toArray($request),
        );
    }
}
