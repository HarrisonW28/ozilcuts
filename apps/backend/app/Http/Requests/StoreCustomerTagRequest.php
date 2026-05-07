<?php

namespace App\Http\Requests;

use App\Models\CustomerTag;
use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if ($user === null) {
            return false;
        }

        return $user->hasRole(Role::SLUG_BARBER) || $user->isAdmin();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'min:1', 'max:'.CustomerTag::MAX_LABEL_LENGTH],
        ];
    }
}
