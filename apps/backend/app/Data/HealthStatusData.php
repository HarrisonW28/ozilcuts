<?php

namespace App\Data;

final readonly class HealthStatusData
{
    public function __construct(
        public string $status,
    ) {}

    /**
     * @return array{status: string}
     */
    public function toArray(): array
    {
        return [
            'status' => $this->status,
        ];
    }
}
