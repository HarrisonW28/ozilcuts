<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\HaircutPhotoResource;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AppointmentHaircutPhotoIndexController extends Controller
{
    public function __invoke(Request $request, Appointment $appointment): JsonResponse
    {
        $this->authorize('view', $appointment);

        $photos = $appointment->haircutPhotos()->get();

        return response()->json([
            'data' => HaircutPhotoResource::collection($photos)->toArray($request),
        ]);
    }
}
