<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateShopInstagramRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        $handle = $this->input('instagram_handle');
        if (! is_string($handle)) {
            return;
        }

        $normalized = ltrim(trim($handle), '@');
        $this->merge([
            'instagram_handle' => $normalized === '' ? null : $normalized,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'instagram_handle' => [
                'nullable',
                'string',
                'max:30',
                'regex:/^[a-zA-Z0-9._]+$/',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'instagram_handle.regex' => 'Use only letters, numbers, dots, and underscores (no @ or spaces).',
        ];
    }
}
