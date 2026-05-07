<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHaircutPhotoRequest;
use App\Http\Resources\HaircutPhotoResource;
use App\Models\Appointment;
use App\Services\HaircutPhotos\HaircutPhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use RuntimeException;

final class AppointmentHaircutPhotoStoreController extends Controller
{
    public function __invoke(
        StoreHaircutPhotoRequest $request,
        Appointment $appointment,
        HaircutPhotoService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $isAssignedBarber = $appointment->barber_user_id === $user->id;
        if (! $user->isAdmin() && ! $isAssignedBarber) {
            abort(403);
        }

        $file = $request->file('photo');
        if (! $file instanceof UploadedFile) {
            return response()->json(['message' => 'A photo file is required.'], 422);
        }

        $caption = $request->input('caption');
        try {
            $photo = $service->addPhoto(
                $appointment,
                $user,
                $file,
                (string) $request->input('kind'),
                is_string($caption) ? $caption : null,
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(
            (new HaircutPhotoResource($photo))->toArray($request),
            201,
        );
    }
}
