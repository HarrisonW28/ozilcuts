<?php

namespace App\Http\Requests\Admin;

use App\Services\Marketing\ShopMarketingService;
use Illuminate\Foundation\Http\FormRequest;

class StoreShopHeroPosterRequest extends FormRequest
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
        $maxKb = max(512, (int) config('marketing.hero_poster.max_kilobytes', 5120));

        return [
            'variant' => ['sometimes', 'string', 'in:desktop,mobile'],
            'poster' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:'.$maxKb],
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
