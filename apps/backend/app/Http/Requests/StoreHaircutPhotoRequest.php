<?php

namespace App\Http\Requests;

use App\Models\HaircutPhoto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHaircutPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'photo' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,jpg,png,webp',
                'max:'.(int) config('security.uploads.max_kilobytes', 5120),
            ],
            'kind' => ['required', Rule::in(HaircutPhoto::KINDS)],
            'caption' => ['sometimes', 'nullable', 'string', 'max:140'],
        ];
    }
}
