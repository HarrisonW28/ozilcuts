<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHairProfilePhotoRequest;
use App\Http\Resources\HairProfilePhotoResource;
use App\Services\Customers\HairProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use RuntimeException;

final class HairProfilePhotoStoreController extends Controller
{
    public function __invoke(
        StoreHairProfilePhotoRequest $request,
        HairProfileService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $profile = $service->findOrCreateFor($user);
        $file = $request->file('photo');
        if (! $file instanceof UploadedFile) {
            return response()->json(['message' => 'A photo file is required.'], 422);
        }

        $caption = $request->input('caption');
        try {
            $photo = $service->addPhoto($profile, $file, is_string($caption) ? $caption : null);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(
            (new HairProfilePhotoResource($photo))->toArray($request),
            201,
        );
    }
}
