<?php

namespace App\Http\Requests;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $actor = $this->user();
        $staffBooks =
            $actor !== null
            && ($actor->isAdmin() || $actor->hasRole(Role::SLUG_BARBER));

        return [
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'barber_user_id' => ['required', 'integer', 'exists:users,id'],
            'starts_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'customer_user_id' => [
                Rule::requiredIf($staffBooks),
                'nullable',
                'integer',
                'exists:users,id',
            ],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function (Validator $validator): void {
            $actor = $this->user();
            if ($actor === null) {
                return;
            }

            $raw = $this->input('customer_user_id');
            if ($actor->hasRole(Role::SLUG_CUSTOMER) && $raw !== null && $raw !== '') {
                $validator->errors()->add(
                    'customer_user_id',
                    'Customers cannot choose a different account.',
                );

                return;
            }

            if ($raw === null || $raw === '') {
                return;
            }

            $target = User::query()->find((int) $raw);
            if ($target === null || ! $target->hasRole(Role::SLUG_CUSTOMER)) {
                $validator->errors()->add(
                    'customer_user_id',
                    'Select a valid customer account.',
                );
            }
        });
    }
}
