<?php

namespace App\Http\Requests\Manage;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBarberProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->route('user');
        if (! $user instanceof User) {
            return false;
        }

        $user->loadMissing('role', 'barberProfile');

        if (! $user->hasRole(Role::SLUG_BARBER) || $user->barberProfile === null) {
            return false;
        }

        return $this->user()->can('update', $user->barberProfile);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'years_experience' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:80'],
            'is_published' => [
                Rule::when($this->user() !== null && $this->user()->isAdmin(), ['sometimes', 'boolean'], ['prohibited']),
            ],
            'shop_latitude' => [
                Rule::when($this->user() !== null && $this->user()->isAdmin(), ['sometimes', 'nullable', 'numeric', 'between:-90,90'], ['prohibited']),
            ],
            'shop_longitude' => [
                Rule::when($this->user() !== null && $this->user()->isAdmin(), ['sometimes', 'nullable', 'numeric', 'between:-180,180'], ['prohibited']),
            ],
        ];
    }
}
