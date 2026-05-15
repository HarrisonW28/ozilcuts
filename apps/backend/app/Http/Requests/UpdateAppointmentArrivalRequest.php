<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateAppointmentArrivalRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'arrival_state' => [
                'required',
                'string',
                Rule::in(['expected', 'arrived', 'waiting', 'in_chair']),
            ],
        ];
    }
}
