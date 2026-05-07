<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\HairProfilePhoto;
use App\Services\Customers\HairProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class HairProfilePhotoDestroyController extends Controller
{
    public function __invoke(
        Request $request,
        HairProfilePhoto $photo,
        HairProfileService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $photo->loadMissing('hairProfile');
        $hairProfile = $photo->hairProfile;
        if ($hairProfile === null) {
            abort(404);
        }

        $isOwner = $hairProfile->user_id === $user->id;
        if (! $isOwner && ! $user->isAdmin()) {
            abort(403);
        }

        $service->removePhoto($photo);

        return response()->json(['deleted' => true]);
    }
}
