<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreShopLogoRequest extends FormRequest
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
        $maxKb = max(256, (int) config('marketing.logo.max_kilobytes', 2048));

        return [
            'logo' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:'.$maxKb],
        ];
    }
}
