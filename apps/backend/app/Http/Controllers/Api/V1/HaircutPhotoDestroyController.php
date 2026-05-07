<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\HaircutPhoto;
use App\Services\HaircutPhotos\HaircutPhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class HaircutPhotoDestroyController extends Controller
{
    public function __invoke(
        Request $request,
        HaircutPhoto $photo,
        HaircutPhotoService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $photo->loadMissing('appointment');
        $appointment = $photo->appointment;
        if ($appointment === null) {
            abort(404);
        }

        $isUploader = $photo->uploaded_by_user_id === $user->id;
        $isAssignedBarber = $appointment->barber_user_id === $user->id;

        if (! $isUploader && ! $isAssignedBarber && ! $user->isAdmin()) {
            abort(403);
        }

        $service->removePhoto($photo);

        return response()->json(['deleted' => true]);
    }
}
