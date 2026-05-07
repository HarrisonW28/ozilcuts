<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Health\HealthCheckService;
use Illuminate\Http\JsonResponse;

final class HealthController extends Controller
{
    public function __invoke(HealthCheckService $health): JsonResponse
    {
        return response()->json($health->status()->toArray());
    }
}
