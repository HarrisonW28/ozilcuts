<?php

namespace App\Http\Requests;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;

class StoreHairProfilePhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->hasRole(Role::SLUG_CUSTOMER);
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
            'caption' => ['sometimes', 'nullable', 'string', 'max:140'],
        ];
    }
}
