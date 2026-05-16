<?php

namespace App\Services\Security;

use Illuminate\Http\UploadedFile;
use RuntimeException;

/**
 * Defense-in-depth validation for customer/staff image uploads.
 */
final class SecureUploadValidator
{
    /**
     * @throws RuntimeException
     */
    public function assertValidImage(UploadedFile $file): void
    {
        if (! $file->isValid()) {
            throw new RuntimeException('The upload did not complete successfully.');
        }

        $maxBytes = max(512000, (int) config('security.uploads.max_kilobytes', 5120) * 1024);
        $size = (int) $file->getSize();
        if ($size < 1 || $size > $maxBytes) {
            throw new RuntimeException('Image exceeds the maximum allowed size.');
        }

        $extension = strtolower((string) ($file->extension() ?: $file->getClientOriginalExtension()));
        $allowedExtensions = config('security.uploads.allowed_extensions', ['jpg', 'jpeg', 'png', 'webp']);
        if (! in_array($extension, $allowedExtensions, true)) {
            throw new RuntimeException('Only JPEG, PNG, and WebP images are allowed.');
        }

        $original = strtolower((string) $file->getClientOriginalName());
        if (preg_match('/\.(php|phtml|phar|js|html|svg|exe|sh|bat)(\.\w+)?$/i', $original)) {
            throw new RuntimeException('This file type is not permitted.');
        }

        $detected = $this->detectMime($file);
        $allowedMimes = config('security.uploads.allowed_mimes', ['image/jpeg', 'image/png', 'image/webp']);
        if (! in_array($detected, $allowedMimes, true)) {
            throw new RuntimeException('Image content type is not permitted.');
        }

        $dimensions = @getimagesize($file->getRealPath() ?: $file->getPathname());
        if ($dimensions === false) {
            throw new RuntimeException('The file is not a valid image.');
        }

        $maxW = max(100, (int) config('security.uploads.max_width', 8000));
        $maxH = max(100, (int) config('security.uploads.max_height', 8000));
        if ($dimensions[0] > $maxW || $dimensions[1] > $maxH) {
            throw new RuntimeException('Image dimensions exceed the maximum allowed size.');
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
