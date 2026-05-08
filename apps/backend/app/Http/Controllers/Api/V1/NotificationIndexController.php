<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class NotificationIndexController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $unreadOnly = $request->boolean('unread');
        $page = Notification::query()
            ->where('user_id', $user->id)
            ->when($unreadOnly, fn ($q) => $q->whereNull('read_at'))
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json(
            NotificationResource::collection($page)->response($request)->getData(true),
        );
    }
}
