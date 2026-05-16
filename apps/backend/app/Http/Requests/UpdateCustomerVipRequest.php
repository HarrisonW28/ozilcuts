<?php

namespace App\Http\Requests;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerVipRequest extends FormRequest
{
    public function authorize(): bool
    {
        $viewer = $this->user();

        return $viewer !== null
            && ($viewer->hasRole(Role::SLUG_BARBER) || $viewer->isAdmin());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'is_vip' => ['required', 'boolean'],
        ];
    }
}
