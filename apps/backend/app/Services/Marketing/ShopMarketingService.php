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
     *     logo_url: string|null,
     *     hero_mp4: string|null,
     *     hero_webm: string|null,
     *     hero_poster: string|null,
     *     instagram_handle: string|null,
     *     instagram_url: string|null,
     * }
     */
    public function publicHomeMarketing(): array
    {
        $admin = $this->shopAdmin();
        if ($admin === null) {
            return [
                'logo_url' => null,
                'hero_mp4' => null,
                'hero_webm' => null,
                'hero_poster' => null,
                'instagram_handle' => $this->defaultInstagramHandle(),
                'instagram_url' => $this->instagramProfileUrl($this->defaultInstagramHandle()),
            ];
        }

        $videoUrl = $this->publicUrl($admin->shop_hero_video_path);
        $extension = $this->extensionFromPath($admin->shop_hero_video_path);
        $instagramHandle = $this->effectiveInstagramHandle($admin);

        return [
            'logo_url' => $this->publicUrl($admin->shop_logo_path),
            'hero_mp4' => $extension === 'mp4' ? $videoUrl : null,
            'hero_webm' => $extension === 'webm' ? $videoUrl : null,
            'hero_poster' => $this->publicUrl($admin->shop_hero_poster_path),
            'instagram_handle' => $instagramHandle,
            'instagram_url' => $this->instagramProfileUrl($instagramHandle),
        ];
    }

    public function updateInstagramHandle(User $admin, ?string $handle): User
    {
        $this->assertShopAdmin($admin);

        if ($handle === null || trim($handle) === '') {
            $admin->shop_instagram_handle = null;
        } else {
            $admin->shop_instagram_handle = $this->normalizeInstagramHandle($handle);
        }

        $admin->save();

        return $admin->fresh(['role']);
    }

    public function storeLogo(User $admin, UploadedFile $file): User
    {
        $this->assertShopAdmin($admin);
        $this->imageValidator->assertValidImage($file);

        if ($admin->shop_logo_path !== null) {
            Storage::disk('public')->delete($admin->shop_logo_path);
        }

        $extension = strtolower((string) ($file->extension() ?: $file->getClientOriginalExtension()));
        $path = $file->storeAs(
            'marketing/logo',
            'logo-'.now()->format('YmdHis').'.'.$extension,
            'public',
        );

        $admin->shop_logo_path = $path;
        $admin->save();

        return $admin->fresh(['role']);
    }

    public function clearLogo(User $admin): User
    {
        $this->assertShopAdmin($admin);

        if ($admin->shop_logo_path !== null) {
            Storage::disk('public')->delete($admin->shop_logo_path);
            $admin->shop_logo_path = null;
            $admin->save();
        }

        return $admin->fresh(['role']);
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

    private function effectiveInstagramHandle(User $admin): ?string
    {
        $stored = $admin->shop_instagram_handle;
        if (is_string($stored) && trim($stored) !== '') {
            return $this->normalizeInstagramHandle($stored);
        }

        return $this->defaultInstagramHandle();
    }

    private function defaultInstagramHandle(): ?string
    {
        $default = config('marketing.default_instagram_handle');
        if (! is_string($default) || trim($default) === '') {
            return null;
        }

        return $this->normalizeInstagramHandle($default);
    }

    private function normalizeInstagramHandle(string $handle): string
    {
        return ltrim(trim($handle), '@');
    }

    private function instagramProfileUrl(?string $handle): ?string
    {
        if ($handle === null || $handle === '') {
            return null;
        }

        return 'https://www.instagram.com/'.$handle.'/';
    }
}
