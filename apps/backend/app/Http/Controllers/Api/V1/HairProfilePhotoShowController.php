<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\HairProfilePhoto;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class HairProfilePhotoShowController extends Controller
{
    public function __invoke(HairProfilePhoto $photo): StreamedResponse
    {
        $disk = Storage::disk($photo->disk);
        if (! $disk->exists($photo->path)) {
            abort(404);
        }

        return $disk->response($photo->path, $photo->original_name, [
            'Content-Type' => $photo->mime_type,
            'Cache-Control' => 'private, max-age=900',
        ]);
    }
}
