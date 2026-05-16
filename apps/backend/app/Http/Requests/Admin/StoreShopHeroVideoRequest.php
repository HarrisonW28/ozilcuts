<?php

namespace App\Http\Requests\Admin;

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
            'video' => ['required', 'file', 'mimetypes:video/mp4,video/webm', 'max:'.$maxKb],
        ];
    }
}
