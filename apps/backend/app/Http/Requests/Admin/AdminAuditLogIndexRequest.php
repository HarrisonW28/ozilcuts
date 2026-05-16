<?php

namespace App\Http\Requests\Admin;

use App\Support\AuditAction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminAuditLogIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->isAdmin();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'category' => ['sometimes', 'string', Rule::in([
                AuditAction::CATEGORY_SECURITY,
                AuditAction::CATEGORY_PRIVILEGED,
                AuditAction::CATEGORY_OPERATIONAL,
            ])],
            'action' => ['sometimes', 'string', 'max:120'],
            'actor_user_id' => ['sometimes', 'integer', 'exists:users,id'],
            'severity' => ['sometimes', 'string', Rule::in([
                AuditAction::SEVERITY_INFO,
                AuditAction::SEVERITY_WARNING,
                AuditAction::SEVERITY_CRITICAL,
            ])],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
