<?php

namespace App\Http\Requests\Admin;

use App\Services\Marketing\ShopMarketingService;
use Illuminate\Foundation\Http\FormRequest;

class StoreShopHeroVideoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->isAdmin();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $maxKb = max(1024, (int) config('marketing.hero_video.max_kilobytes', 51200));

        return [
            'variant' => ['sometimes', 'string', 'in:desktop,mobile'],
            'video' => ['required', 'file', 'mimetypes:video/mp4,video/webm', 'max:'.$maxKb],
        ];
    }

    public function heroVariant(): string
    {
        $variant = $this->input('variant', ShopMarketingService::HERO_VARIANT_DESKTOP);

        return is_string($variant) && $variant === ShopMarketingService::HERO_VARIANT_MOBILE
            ? ShopMarketingService::HERO_VARIANT_MOBILE
            : ShopMarketingService::HERO_VARIANT_DESKTOP;
    }
}
