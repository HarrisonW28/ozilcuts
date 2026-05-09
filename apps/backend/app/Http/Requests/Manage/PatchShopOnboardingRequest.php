<?php

namespace App\Http\Requests\Manage;

use Illuminate\Foundation\Http\FormRequest;

class PatchShopOnboardingRequest extends FormRequest
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
        return [
            'shop_display_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'onboarding_step' => ['sometimes', 'integer', 'min:1', 'max:6'],
            'shop_pays_cash_only' => ['sometimes', 'boolean'],
            'shop_deposits_enabled' => ['sometimes', 'boolean'],
            'shop_tap_to_pay_later' => ['sometimes', 'boolean'],
            'complete' => ['sometimes', 'boolean'],
        ];
    }
}
