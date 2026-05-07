<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateHaircutPhotoRequest;
use App\Http\Resources\HaircutPhotoResource;
use App\Models\HaircutPhoto;
use App\Services\HaircutPhotos\HaircutPhotoService;
use Illuminate\Http\JsonResponse;

final class HaircutPhotoUpdateController extends Controller
{
    public function __invoke(
        UpdateHaircutPhotoRequest $request,
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

        $isCustomer = $appointment->customer_user_id === $user->id;
        $isAssignedBarber = $appointment->barber_user_id === $user->id;
        $isAdmin = $user->isAdmin();

        if (! $isCustomer && ! $isAssignedBarber && ! $isAdmin) {
            abort(403);
        }

        $data = $request->validated();
        $touchedConsent = array_key_exists('customer_consent', $data);
        $touchedStaff = array_intersect_key(
            $data,
            array_flip(['caption', 'kind', 'is_public']),
        ) !== [];

        if ($touchedStaff && $isCustomer && ! $isAdmin) {
            abort(403);
        }

        if ($touchedConsent && ! $isCustomer && ! $isAdmin) {
            abort(403);
        }

        if ($touchedConsent) {
            $photo = $service->setCustomerConsent($photo, (bool) $data['customer_consent']);
        }
        if ($touchedStaff) {
            $photo = $service->staffUpdate($photo, $data);
        }

        return response()->json((new HaircutPhotoResource($photo))->toArray($request));
    }
}
