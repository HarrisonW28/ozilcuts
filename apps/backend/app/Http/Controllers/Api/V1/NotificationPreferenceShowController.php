<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Notifications\NotificationChannels;
use App\Notifications\NotificationEvents;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class NotificationPreferenceShowController extends Controller
{
    public function __invoke(
        Request $request,
        NotificationService $notifications,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        return response()->json([
            'preferences' => $notifications->preferences($user),
            'events' => array_map(
                fn (string $key) => [
                    'key' => $key,
                    'label' => NotificationEvents::META[$key]['label'] ?? $key,
                    'description' => NotificationEvents::META[$key]['description'] ?? '',
                ],
                NotificationEvents::ALL,
            ),
            'channels' => array_map(
                fn (string $key) => [
                    'key' => $key,
                    'label' => NotificationChannels::META[$key]['label'] ?? $key,
                ],
                NotificationChannels::ALL,
            ),
        ]);
    }
}
