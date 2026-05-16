<?php

namespace App\Services\Security;

use Illuminate\Http\UploadedFile;
use RuntimeException;

final class MarketingVideoValidator
{
    /**
     * @throws RuntimeException
     */
    public function assertValidHeroVideo(UploadedFile $file): void
    {
        if (! $file->isValid()) {
            throw new RuntimeException('The upload did not complete successfully.');
        }

        $maxBytes = max(1_048_576, (int) config('marketing.hero_video.max_kilobytes', 51200) * 1024);
        $size = (int) $file->getSize();
        if ($size < 1 || $size > $maxBytes) {
            throw new RuntimeException('Video exceeds the maximum allowed size.');
        }

        $extension = strtolower((string) ($file->extension() ?: $file->getClientOriginalExtension()));
        $allowedExtensions = config('marketing.hero_video.allowed_extensions', ['mp4', 'webm']);
        if (! in_array($extension, $allowedExtensions, true)) {
            throw new RuntimeException('Only MP4 and WebM videos are allowed.');
        }

        $original = strtolower((string) $file->getClientOriginalName());
        if (preg_match('/\.(php|phtml|phar|js|html|exe|sh|bat)(\.\w+)?$/i', $original)) {
            throw new RuntimeException('This file type is not permitted.');
        }

        $detected = $this->detectMime($file);
        $allowedMimes = config('marketing.hero_video.allowed_mimes', ['video/mp4', 'video/webm']);
        $clientMime = strtolower((string) $file->getMimeType());
        $mimeOk = in_array($detected, $allowedMimes, true)
            || (in_array($clientMime, $allowedMimes, true) && in_array($detected, ['application/octet-stream', 'application/x-empty'], true));

        if (! $mimeOk) {
            throw new RuntimeException('Video content type is not permitted.');
        }
    }

    private function detectMime(UploadedFile $file): string
    {
        $path = $file->getRealPath() ?: $file->getPathname();
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($path);

        return is_string($mime) ? strtolower($mime) : 'application/octet-stream';
    }
}
