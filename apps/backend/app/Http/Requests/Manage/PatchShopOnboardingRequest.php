<?php

namespace App\Http\Requests\Manage;

use App\Http\Requests\Concerns\ValidatesAvailabilityFlatWindows;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class PatchShopOnboardingRequest extends FormRequest
{
    use ValidatesAvailabilityFlatWindows;

    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->isAdmin();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return array_merge([
            'shop_display_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'onboarding_step' => ['sometimes', 'integer', 'min:1', 'max:6'],
            'shop_pays_cash_only' => ['sometimes', 'boolean'],
            'shop_deposits_enabled' => ['sometimes', 'boolean'],
            'shop_tap_to_pay_later' => ['sometimes', 'boolean'],
            'complete' => ['sometimes', 'boolean'],
            'shop_default_hours' => ['sometimes', 'nullable', 'array'],
        ], $this->availabilityFlatWindowItemRules('shop_default_hours'));
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var list<mixed>|null $hours */
            $hours = $this->input('shop_default_hours');
            $this->validateAvailabilityFlatWindowsNotOverlapping($validator, 'shop_default_hours', is_array($hours) ? $hours : null);
        });
    }
}
