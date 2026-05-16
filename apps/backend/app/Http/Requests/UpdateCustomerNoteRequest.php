<?php

namespace App\Http\Requests;

use App\Models\CustomerNote;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        $note = $this->route('note');

        return $note instanceof CustomerNote
            && $this->user()?->can('update', $note) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['sometimes', 'string', 'min:1', 'max:5000'],
            'pinned' => ['sometimes', 'boolean'],
        ];
    }
}
