<?php

namespace App\Http\Requests;

use App\Models\CustomerTag;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        $customer = $this->route('user');

        return $customer instanceof User
            && $this->user()?->can('manageStaffCrm', $customer) === true;
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
