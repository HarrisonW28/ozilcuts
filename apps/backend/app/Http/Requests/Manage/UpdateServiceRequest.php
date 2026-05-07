<?php

namespace App\Http\Requests\Manage;

use App\Models\Service;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $service = $this->route('service');

        return $service instanceof Service
            && $this->user() !== null
            && $this->user()->can('update', $service);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Service $service */
        $service = $this->route('service');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('services', 'slug')->ignore($service->id)],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'duration_minutes' => ['sometimes', 'integer', 'min:1', 'max:600'],
            'price_cents' => ['sometimes', 'integer', 'min:0', 'max:100000000'],
            'deposit_cents' => ['sometimes', 'integer', 'min:0', 'max:100000000'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
