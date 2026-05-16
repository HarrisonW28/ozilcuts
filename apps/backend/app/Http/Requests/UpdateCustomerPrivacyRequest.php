<?php

namespace App\Http\Requests;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerPrivacyRequest extends FormRequest
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
            'marketing_opt_in' => ['sometimes', 'boolean'],
            'arrival_location_opt_in' => ['sometimes', 'boolean'],
            'retention_paused' => ['sometimes', 'boolean'],
        ];
    }
}
