<?php

namespace App\Http\Requests;

use App\Notifications\NotificationChannels;
use App\Notifications\NotificationEvents;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNotificationPreferencesRequest extends FormRequest
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
        return [
            'preferences' => ['required', 'array'],
            'preferences.*.event_key' => ['required', 'string', Rule::in(NotificationEvents::ALL)],
            'preferences.*.channel' => ['required', 'string', Rule::in(NotificationChannels::ALL)],
            'preferences.*.enabled' => ['required', 'boolean'],
        ];
    }
}
