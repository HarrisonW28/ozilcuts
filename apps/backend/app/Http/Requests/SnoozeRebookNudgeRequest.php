<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SnoozeRebookNudgeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'days' => ['sometimes', 'integer', 'min:1', 'max:365'],
        ];
    }

    public function days(): int
    {
        $days = (int) $this->input('days', 7);

        return max(1, min(365, $days));
    }
}
