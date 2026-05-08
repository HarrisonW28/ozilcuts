<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class NotificationMarkAllReadController extends Controller
{
    public function __invoke(
        Request $request,
        NotificationService $notifications,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $count = $notifications->markAllRead($user);

        return response()->json([
            'updated' => $count,
            'unread' => $notifications->unreadCount($user),
        ]);
    }
}
