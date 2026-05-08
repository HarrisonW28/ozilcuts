<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RevenueReportRequest;
use App\Services\Reports\RevenueReportService;
use Illuminate\Http\JsonResponse;

final class RevenueReportController extends Controller
{
    public function __invoke(
        RevenueReportRequest $request,
        RevenueReportService $service,
    ): JsonResponse {
        $from = $request->from();
        $to = $request->to();
        $granularity = $request->granularity();

        return response()->json([
            'summary' => $service->summary($from, $to),
            'by_barber' => $service->byBarber($from, $to),
            'by_service' => $service->byService($from, $to),
            'series' => $service->series($from, $to, $granularity),
            'granularity' => $granularity,
        ]);
    }
}
