<?php

namespace App\Http\Requests\Admin;

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
            'poster' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:'.$maxKb],
        ];
    }
}
