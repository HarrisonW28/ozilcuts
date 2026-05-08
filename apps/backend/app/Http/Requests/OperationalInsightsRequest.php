<?php

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class OperationalInsightsRequest extends FormRequest
{
    public const MAX_RANGE_DAYS = 366;

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
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            if ($v->errors()->isNotEmpty()) {
                return;
            }
            $from = CarbonImmutable::parse((string) $this->input('from'))->startOfDay();
            $to = CarbonImmutable::parse((string) $this->input('to'))->endOfDay();
            if ($from->diffInDays($to) > self::MAX_RANGE_DAYS) {
                $v->errors()->add('to', 'Range may not exceed '.self::MAX_RANGE_DAYS.' days.');
            }
        });
    }

    public function from(): CarbonImmutable
    {
        return CarbonImmutable::parse((string) $this->input('from'));
    }

    public function to(): CarbonImmutable
    {
        return CarbonImmutable::parse((string) $this->input('to'));
    }
}
