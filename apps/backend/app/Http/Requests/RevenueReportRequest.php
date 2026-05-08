<?php

namespace App\Http\Requests;

use App\Services\Reports\RevenueReportService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class RevenueReportRequest extends FormRequest
{
    public const MAX_RANGE_DAYS = 366;

    public function authorize(): bool
    {
        $user = $this->user();
        if ($user === null) {
            return false;
        }

        return $user->isAdmin();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'granularity' => [
                'sometimes',
                'in:'.RevenueReportService::GRANULARITY_DAY.','.RevenueReportService::GRANULARITY_MONTH,
            ],
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
                $v->errors()->add(
                    'to',
                    'Range may not exceed '.self::MAX_RANGE_DAYS.' days.',
                );
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

    public function granularity(): string
    {
        $value = (string) $this->input('granularity', RevenueReportService::GRANULARITY_DAY);

        return $value === RevenueReportService::GRANULARITY_MONTH
            ? RevenueReportService::GRANULARITY_MONTH
            : RevenueReportService::GRANULARITY_DAY;
    }
}
