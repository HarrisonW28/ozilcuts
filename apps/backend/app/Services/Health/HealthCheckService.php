<?php

namespace App\Services\Health;

use App\Data\HealthStatusData;

final class HealthCheckService
{
    public function status(): HealthStatusData
    {
        return new HealthStatusData(status: 'ok');
    }
}
