<?php

namespace App\Http\Requests\Manage;

use App\Http\Requests\Concerns\ValidatesAvailabilityFlatWindows;
use App\Models\BarberProfile;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ReplaceBarberAvailabilityRequest extends FormRequest
{
    use ValidatesAvailabilityFlatWindows;

    public function authorize(): bool
    {
        $user = $this->route('user');

        if (! $user instanceof User) {
            return false;
        }

        $profile = $user->barberProfile;

        return $profile instanceof BarberProfile
            && $this->user() !== null
            && $this->user()->can('update', $profile);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return array_merge([
            'windows' => ['present', 'array'],
        ], $this->availabilityFlatWindowItemRules('windows'));
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var list<mixed>|null $windows */
            $windows = $this->input('windows');
            $this->validateAvailabilityFlatWindowsNotOverlapping($validator, 'windows', is_array($windows) ? $windows : null);
        });
    }
}
