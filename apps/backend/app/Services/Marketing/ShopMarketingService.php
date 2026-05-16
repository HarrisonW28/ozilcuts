<?php

namespace App\Services\Marketing;

use App\Models\Role;
use App\Models\User;
use App\Services\Security\MarketingVideoValidator;
use App\Services\Security\SecureUploadValidator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class ShopMarketingService
{
    public function __construct(
        private readonly MarketingVideoValidator $videoValidator,
        private readonly SecureUploadValidator $imageValidator,
    ) {}

    /**
     * @return array{
     *     hero_mp4: string|null,
     *     hero_webm: string|null,
     *     hero_poster: string|null,
     * }
     */
    public function publicHomeMarketing(): array
    {
        $admin = $this->shopAdmin();
        if ($admin === null) {
            return [
                'hero_mp4' => null,
                'hero_webm' => null,
                'hero_poster' => null,
            ];
        }

        $videoUrl = $this->publicUrl($admin->shop_hero_video_path);
        $extension = $this->extensionFromPath($admin->shop_hero_video_path);

        return [
            'hero_mp4' => $extension === 'mp4' ? $videoUrl : null,
            'hero_webm' => $extension === 'webm' ? $videoUrl : null,
            'hero_poster' => $this->publicUrl($admin->shop_hero_poster_path),
        ];
    }

    public function storeHeroVideo(User $admin, UploadedFile $file): User
    {
        $this->assertShopAdmin($admin);
        $this->videoValidator->assertValidHeroVideo($file);

        if ($admin->shop_hero_video_path !== null) {
            Storage::disk('public')->delete($admin->shop_hero_video_path);
        }

        $extension = strtolower((string) ($file->extension() ?: $file->getClientOriginalExtension()));
        $path = $file->storeAs(
            'marketing/hero',
            'hero-'.now()->format('YmdHis').'.'.$extension,
            'public',
        );

        $admin->shop_hero_video_path = $path;
        $admin->save();

        return $admin->fresh(['role']);
    }

    public function storeHeroPoster(User $admin, UploadedFile $file): User
    {
        $this->assertShopAdmin($admin);
        $this->imageValidator->assertValidImage($file);

        if ($admin->shop_hero_poster_path !== null) {
            Storage::disk('public')->delete($admin->shop_hero_poster_path);
        }

        $extension = strtolower((string) ($file->extension() ?: $file->getClientOriginalExtension()));
        $path = $file->storeAs(
            'marketing/hero',
            'hero-poster-'.now()->format('YmdHis').'.'.$extension,
            'public',
        );

        $admin->shop_hero_poster_path = $path;
        $admin->save();

        return $admin->fresh(['role']);
    }

    public function clearHeroVideo(User $admin): User
    {
        $this->assertShopAdmin($admin);

        if ($admin->shop_hero_video_path !== null) {
            Storage::disk('public')->delete($admin->shop_hero_video_path);
            $admin->shop_hero_video_path = null;
            $admin->save();
        }

        return $admin->fresh(['role']);
    }

    public function shopAdmin(): ?User
    {
        return User::query()
            ->whereHas('role', fn ($q) => $q->where('slug', Role::SLUG_ADMIN))
            ->orderBy('id')
            ->first();
    }

    private function assertShopAdmin(User $user): void
    {
        if (! $user->isAdmin()) {
            throw new RuntimeException('Only shop administrators can manage marketing media.');
        }
    }

    private function publicUrl(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        return Storage::disk('public')->url($path);
    }

    private function extensionFromPath(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return $extension !== '' ? $extension : null;
    }
}
