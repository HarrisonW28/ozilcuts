<?php

namespace App\Http\Requests;

use App\Models\HairProfile;
use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHairProfileRequest extends FormRequest
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
            'hair_type' => ['sometimes', 'nullable', Rule::in(HairProfile::HAIR_TYPES)],
            'hair_thickness' => ['sometimes', 'nullable', Rule::in(HairProfile::HAIR_THICKNESSES)],
            'hair_length' => ['sometimes', 'nullable', Rule::in(HairProfile::HAIR_LENGTHS)],
            'scalp_condition' => ['sometimes', 'nullable', Rule::in(HairProfile::SCALP_CONDITIONS)],
            'preferred_clipper_guard' => ['sometimes', 'nullable', 'string', 'max:32'],
            'allergies' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'styling_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}
