<?php

namespace App\Http\Requests;

use App\Models\Appointment;
use App\Models\AppointmentMessage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class AppointmentMessageStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        $appointment = $this->route('appointment');

        return $appointment instanceof Appointment
            && $this->user()?->can('sendMessages', $appointment) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'kind' => ['required', 'string', Rule::in([
                AppointmentMessage::KIND_NOTE,
                AppointmentMessage::KIND_OPERATIONAL,
                AppointmentMessage::KIND_PRESET,
            ])],
            'body' => ['nullable', 'string', 'max:1000'],
            'operational_key' => ['nullable', 'string', 'max:48'],
            'preset_key' => ['nullable', 'string', 'max:48'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $kind = $this->input('kind');
            if ($kind === AppointmentMessage::KIND_NOTE) {
                $body = $this->input('body');
                if (! is_string($body) || trim($body) === '') {
                    $v->errors()->add('body', 'A note body is required.');
                }
            }
            if ($kind === AppointmentMessage::KIND_OPERATIONAL) {
                $key = $this->input('operational_key');
                if (! is_string($key) || trim($key) === '') {
                    $v->errors()->add('operational_key', 'Choose an operational template.');
                }
            }
            if ($kind === AppointmentMessage::KIND_PRESET) {
                $pk = $this->input('preset_key');
                if (! is_string($pk) || trim($pk) === '') {
                    $v->errors()->add('preset_key', 'Choose a quick reply.');
                }
            }
        });
    }
}
