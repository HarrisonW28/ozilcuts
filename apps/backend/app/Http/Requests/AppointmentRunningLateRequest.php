<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AppointmentRunningLateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'late_by_minutes' => ['required', 'integer', 'min:1', 'max:120'],
        ];
    }
}
