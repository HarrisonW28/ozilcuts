<?php

namespace App\Http\Requests;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerProfileRequest extends FormRequest
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
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'preferred_barber_user_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(function ($query) {
                    $query->whereExists(function ($subquery) {
                        $subquery
                            ->selectRaw('1')
                            ->from('roles')
                            ->whereColumn('roles.id', 'users.role_id')
                            ->where('roles.slug', Role::SLUG_BARBER);
                    });
                }),
            ],
            'preferences' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'marketing_opt_in' => ['sometimes', 'boolean'],
        ];
    }
}
