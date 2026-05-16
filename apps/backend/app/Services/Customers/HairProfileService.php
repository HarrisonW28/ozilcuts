<?php

namespace App\Services\Customers;

use App\Models\HairProfile;
use App\Models\HairProfilePhoto;
use App\Models\Role;
use App\Models\User;
use App\Services\Security\SecureUploadValidator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

final class HairProfileService
{
    public function __construct(
        private readonly SecureUploadValidator $uploadValidator,
    ) {}

    public const PHOTO_DISK = 'local';

    public const PHOTO_MAX_PER_PROFILE = 8;

    public function findOrCreateFor(User $user): HairProfile
    {
        $user->loadMissing('role');
        if (! $user->hasRole(Role::SLUG_CUSTOMER)) {
            throw new RuntimeException('Only customer accounts have hair profiles.');
        }

        return HairProfile::query()->firstOrCreate([
            'user_id' => $user->id,
        ])->refresh();
    }

    public function findForUser(User $user): ?HairProfile
    {
        return HairProfile::query()
            ->where('user_id', $user->id)
            ->with(['photos', 'user'])
            ->first();
    }

    /**
     * @param  array{
     *     hair_type?: string|null,
     *     hair_thickness?: string|null,
     *     hair_length?: string|null,
     *     scalp_condition?: string|null,
     *     preferred_clipper_guard?: string|null,
     *     allergies?: string|null,
     *     styling_notes?: string|null,
     * }  $data
     */
    public function update(HairProfile $profile, array $data): HairProfile
    {
        $profile->update(array_intersect_key($data, array_flip([
            'hair_type',
            'hair_thickness',
            'hair_length',
            'scalp_condition',
            'preferred_clipper_guard',
            'allergies',
            'styling_notes',
        ])));

        return $profile->refresh()->load(['photos', 'user']);
    }

    public function addPhoto(HairProfile $profile, UploadedFile $file, ?string $caption): HairProfilePhoto
    {
        $this->uploadValidator->assertValidImage($file);

        if ($profile->photos()->count() >= self::PHOTO_MAX_PER_PROFILE) {
            throw new RuntimeException(
                'You\'ve reached the photo limit ('.self::PHOTO_MAX_PER_PROFILE.'). Remove one before uploading another.'
            );
        }

        $extension = strtolower((string) ($file->extension() ?: $file->getClientOriginalExtension()));
        $extension = $extension !== '' ? $extension : 'jpg';
        $name = Str::uuid()->toString().'.'.$extension;
        $directory = 'hair-profiles/'.$profile->user_id;

        $stored = $file->storeAs($directory, $name, [
            'disk' => self::PHOTO_DISK,
        ]);
        if ($stored === false) {
            throw new RuntimeException('Photo could not be saved.');
        }

        return HairProfilePhoto::query()->create([
            'hair_profile_id' => $profile->id,
            'disk' => self::PHOTO_DISK,
            'path' => $stored,
            'original_name' => Str::limit((string) $file->getClientOriginalName(), 240, ''),
            'mime_type' => (string) ($file->getMimeType() ?? 'application/octet-stream'),
            'size_bytes' => (int) $file->getSize(),
            'caption' => $caption,
        ]);
    }

    public function removePhoto(HairProfilePhoto $photo): void
    {
        Storage::disk($photo->disk)->delete($photo->path);
        $photo->delete();
    }
}
