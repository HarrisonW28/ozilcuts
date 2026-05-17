<?php

namespace App\Services\Marketing;

use App\Models\Role;
use App\Models\User;
use App\Services\Security\MarketingVideoValidator;
use App\Services\Security\SecureUploadValidator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ShopMarketingService
{
    public const HERO_VARIANT_DESKTOP = 'desktop';

    public const HERO_VARIANT_MOBILE = 'mobile';

    public function __construct(
        private readonly MarketingVideoValidator $videoValidator,
        private readonly SecureUploadValidator $imageValidator,
    ) {}

    /**
     * @return array{
     *     logo_url: string|null,
     *     hero_desktop_mp4: string|null,
     *     hero_desktop_webm: string|null,
     *     hero_desktop_poster: string|null,
     *     hero_mobile_mp4: string|null,
     *     hero_mobile_webm: string|null,
     *     hero_mobile_poster: string|null,
     *     instagram_handle: string|null,
     *     instagram_url: string|null,
     * }
     */
    public function publicHomeMarketing(): array
    {
        $admin = $this->shopAdmin();
        if ($admin === null) {
            return $this->emptyPublicMarketing();
        }

        $instagramHandle = $this->effectiveInstagramHandle($admin);

        return [
            'logo_url' => $this->publicUrl($admin->shop_logo_path),
            ...$this->heroSlotPublicUrls(
                $admin->shop_hero_video_path,
                $admin->shop_hero_poster_path,
                'desktop',
            ),
            ...$this->heroSlotPublicUrls(
                $admin->shop_hero_video_mobile_path,
                $admin->shop_hero_poster_mobile_path,
                'mobile',
            ),
            'instagram_handle' => $instagramHandle,
            'instagram_url' => $this->instagramProfileUrl($instagramHandle),
        ];
    }

    /**
     * @return array{
     *     logo_url: string|null,
     *     hero_desktop_mp4: string|null,
     *     hero_desktop_webm: string|null,
     *     hero_desktop_poster: string|null,
     *     hero_mobile_mp4: string|null,
     *     hero_mobile_webm: string|null,
     *     hero_mobile_poster: string|null,
     *     instagram_handle: string|null,
     *     instagram_url: string|null,
     * }
     */
    private function emptyPublicMarketing(): array
    {
        $handle = $this->defaultInstagramHandle();

        return [
            'logo_url' => null,
            'hero_desktop_mp4' => null,
            'hero_desktop_webm' => null,
            'hero_desktop_poster' => null,
            'hero_mobile_mp4' => null,
            'hero_mobile_webm' => null,
            'hero_mobile_poster' => null,
            'instagram_handle' => $handle,
            'instagram_url' => $this->instagramProfileUrl($handle),
        ];
    }

    /**
     * @return array{
     *     hero_{variant}_mp4: string|null,
     *     hero_{variant}_webm: string|null,
     *     hero_{variant}_poster: string|null,
     * }
     */
    private function heroSlotPublicUrls(
        ?string $videoPath,
        ?string $posterPath,
        string $variant,
    ): array {
        $videoUrl = $this->publicUrl($videoPath);
        $extension = $this->extensionFromPath($videoPath);
        $prefix = 'hero_'.$variant;

        return [
            $prefix.'_mp4' => $extension === 'mp4' ? $videoUrl : null,
            $prefix.'_webm' => $extension === 'webm' ? $videoUrl : null,
            $prefix.'_poster' => $this->publicUrl($posterPath),
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

    public function storeHeroVideo(User $admin, UploadedFile $file, string $variant): User
    {
        $this->assertShopAdmin($admin);
        $this->assertHeroVariant($variant);
        $this->videoValidator->assertValidHeroVideo($file);

        $column = $variant === self::HERO_VARIANT_MOBILE
            ? 'shop_hero_video_mobile_path'
            : 'shop_hero_video_path';

        $existing = $admin->{$column};
        if ($existing !== null) {
            Storage::disk('public')->delete($existing);
        }

        $extension = strtolower((string) ($file->extension() ?: $file->getClientOriginalExtension()));
        $path = $file->storeAs(
            'marketing/hero',
            'hero-'.$variant.'-'.now()->format('YmdHis').'.'.$extension,
            'public',
        );

        $admin->{$column} = $path;
        $admin->save();

        return $admin->fresh(['role']);
    }

    public function storeHeroPoster(User $admin, UploadedFile $file, string $variant): User
    {
        $this->assertShopAdmin($admin);
        $this->assertHeroVariant($variant);
        $this->imageValidator->assertValidImage($file);

        $column = $variant === self::HERO_VARIANT_MOBILE
            ? 'shop_hero_poster_mobile_path'
            : 'shop_hero_poster_path';

        $existing = $admin->{$column};
        if ($existing !== null) {
            Storage::disk('public')->delete($existing);
        }

        $extension = strtolower((string) ($file->extension() ?: $file->getClientOriginalExtension()));
        $path = $file->storeAs(
            'marketing/hero',
            'hero-poster-'.$variant.'-'.now()->format('YmdHis').'.'.$extension,
            'public',
        );

        $admin->{$column} = $path;
        $admin->save();

        return $admin->fresh(['role']);
    }

    public function clearHeroVideo(User $admin, ?string $variant = null): User
    {
        $this->assertShopAdmin($admin);

        if ($variant === null || $variant === self::HERO_VARIANT_DESKTOP) {
            if ($admin->shop_hero_video_path !== null) {
                Storage::disk('public')->delete($admin->shop_hero_video_path);
                $admin->shop_hero_video_path = null;
            }
        }

        if ($variant === null || $variant === self::HERO_VARIANT_MOBILE) {
            if ($admin->shop_hero_video_mobile_path !== null) {
                Storage::disk('public')->delete($admin->shop_hero_video_mobile_path);
                $admin->shop_hero_video_mobile_path = null;
            }
        }

        $admin->save();

        return $admin->fresh(['role']);
    }

    public function clearHeroPoster(User $admin, ?string $variant = null): User
    {
        $this->assertShopAdmin($admin);

        if ($variant === null || $variant === self::HERO_VARIANT_DESKTOP) {
            if ($admin->shop_hero_poster_path !== null) {
                Storage::disk('public')->delete($admin->shop_hero_poster_path);
                $admin->shop_hero_poster_path = null;
            }
        }

        if ($variant === null || $variant === self::HERO_VARIANT_MOBILE) {
            if ($admin->shop_hero_poster_mobile_path !== null) {
                Storage::disk('public')->delete($admin->shop_hero_poster_mobile_path);
                $admin->shop_hero_poster_mobile_path = null;
            }
        }

        $admin->save();

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

    private function assertHeroVariant(string $variant): void
    {
        if (! in_array($variant, [self::HERO_VARIANT_DESKTOP, self::HERO_VARIANT_MOBILE], true)) {
            throw new RuntimeException('Invalid hero media variant.');
        }
    }

    public function streamPublicAsset(string $path): StreamedResponse
    {
        if (! $this->isPublicMarketingPath($path)) {
            abort(404);
        }

        if (! Storage::disk('public')->exists($path)) {
            abort(404);
        }

        return Storage::disk('public')->response($path);
    }

    private function publicUrl(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        return url('/api/v1/public/marketing/asset?f='.rawurlencode($path));
    }

    private function isPublicMarketingPath(string $path): bool
    {
        if ($path === '' || str_contains($path, '..') || str_starts_with($path, '/')) {
            return false;
        }

        return str_starts_with($path, 'marketing/');
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
