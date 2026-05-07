<?php

namespace App\Services\HaircutPhotos;

use App\Models\Appointment;
use App\Models\HaircutPhoto;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

final class HaircutPhotoService
{
    public const PHOTO_DISK = 'local';

    public const PHOTO_MAX_PER_APPOINTMENT = 12;

    public function addPhoto(
        Appointment $appointment,
        User $uploader,
        UploadedFile $file,
        string $kind,
        ?string $caption,
    ): HaircutPhoto {
        if (! in_array($kind, HaircutPhoto::KINDS, true)) {
            throw new RuntimeException('Invalid photo kind.');
        }

        if ($appointment->haircutPhotos()->count() >= self::PHOTO_MAX_PER_APPOINTMENT) {
            throw new RuntimeException(
                'Photo limit reached ('.self::PHOTO_MAX_PER_APPOINTMENT.'). Remove one before adding another.'
            );
        }

        $extension = strtolower((string) ($file->extension() ?: $file->getClientOriginalExtension()));
        $extension = $extension !== '' ? $extension : 'jpg';
        $name = Str::uuid()->toString().'.'.$extension;
        $directory = 'haircut-photos/'.$appointment->id;

        $stored = $file->storeAs($directory, $name, [
            'disk' => self::PHOTO_DISK,
        ]);
        if ($stored === false) {
            throw new RuntimeException('Photo could not be saved.');
        }

        return HaircutPhoto::query()->create([
            'appointment_id' => $appointment->id,
            'uploaded_by_user_id' => $uploader->id,
            'kind' => $kind,
            'disk' => self::PHOTO_DISK,
            'path' => $stored,
            'original_name' => Str::limit((string) $file->getClientOriginalName(), 240, ''),
            'mime_type' => (string) ($file->getMimeType() ?? 'application/octet-stream'),
            'size_bytes' => (int) $file->getSize(),
            'caption' => $caption,
            'is_public' => false,
            'customer_consent' => false,
        ]);
    }

    /**
     * Apply staff-side updates (caption, kind, is_public).
     * `is_public` is forced to false unless customer_consent is currently true.
     *
     * @param  array{caption?: string|null, kind?: string, is_public?: bool}  $data
     */
    public function staffUpdate(HaircutPhoto $photo, array $data): HaircutPhoto
    {
        $allowed = array_intersect_key($data, array_flip(['caption', 'kind', 'is_public']));

        if (array_key_exists('is_public', $allowed)) {
            $allowed['is_public'] = (bool) $allowed['is_public'] && $photo->customer_consent === true;
        }

        $photo->update($allowed);

        return $photo->refresh();
    }

    /**
     * Apply customer consent toggle. Revoking consent automatically un-publishes.
     */
    public function setCustomerConsent(HaircutPhoto $photo, bool $consent): HaircutPhoto
    {
        $photo->customer_consent = $consent;
        if (! $consent) {
            $photo->is_public = false;
        }
        $photo->save();

        return $photo->refresh();
    }

    public function removePhoto(HaircutPhoto $photo): void
    {
        Storage::disk($photo->disk)->delete($photo->path);
        $photo->delete();
    }
}
