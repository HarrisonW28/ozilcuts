<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Notifications\NotificationEvents;
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
        $operationalOnly = $request->boolean('operational');
        // Allow the in-app bell popover to ask for a small slice without
        // pulling the full inbox page. Clamp to a sane upper bound.
        $perPage = max(1, min((int) $request->integer('per_page', 20), 50));
        $page = Notification::query()
            ->where('user_id', $user->id)
            ->when($unreadOnly, fn ($q) => $q->whereNull('read_at'))
            ->when($operationalOnly, function ($q): void {
                $q->where(function ($inner): void {
                    $inner->whereIn('type', NotificationEvents::OPERATIONAL_ALERTS)
                        ->orWhere(function ($visit): void {
                            $visit->where('type', NotificationEvents::APPOINTMENT_VISIT_MESSAGE)
                                ->where('data->urgency', 'operational');
                        });
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json(
            NotificationResource::collection($page)->response($request)->getData(true),
        );
    }
}
