<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerNoteRequest extends FormRequest
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
            'body' => ['required', 'string', 'min:1', 'max:5000'],
            'pinned' => ['sometimes', 'boolean'],
        ];
    }
}
