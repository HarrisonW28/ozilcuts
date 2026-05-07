<?php

namespace App\Http\Requests;

use App\Models\HaircutPhoto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHaircutPhotoRequest extends FormRequest
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
            'caption' => ['sometimes', 'nullable', 'string', 'max:140'],
            'kind' => ['sometimes', Rule::in(HaircutPhoto::KINDS)],
            'is_public' => ['sometimes', 'boolean'],
            'customer_consent' => ['sometimes', 'boolean'],
        ];
    }
}
