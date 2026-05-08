<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RevenueReportRequest;
use App\Services\Reports\RevenueReportService;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class RevenueReportCsvController extends Controller
{
    public function __invoke(
        RevenueReportRequest $request,
        RevenueReportService $service,
    ): StreamedResponse {
        $from = $request->from();
        $to = $request->to();
        $granularity = $request->granularity();

        $summary = $service->summary($from, $to);
        $byBarber = $service->byBarber($from, $to);
        $byService = $service->byService($from, $to);
        $series = $service->series($from, $to, $granularity);

        $filename = sprintf(
            'revenue_%s_%s.csv',
            $from->toDateString(),
            $to->toDateString(),
        );

        return response()->streamDownload(
            function () use ($summary, $byBarber, $byService, $series): void {
                $out = fopen('php://output', 'w');
                if ($out === false) {
                    return;
                }

                fputcsv($out, ['Section', 'Key', 'Value']);
                fputcsv($out, ['summary', 'from', $summary['from']]);
                fputcsv($out, ['summary', 'to', $summary['to']]);
                fputcsv($out, ['summary', 'booked_cents', $summary['booked_cents']]);
                fputcsv($out, ['summary', 'collected_cents', $summary['collected_cents']]);
                fputcsv($out, ['summary', 'refunded_cents', $summary['refunded_cents']]);
                fputcsv($out, ['summary', 'net_collected_cents', $summary['net_collected_cents']]);
                fputcsv($out, ['summary', 'booked_appointments', $summary['booked_appointments']]);
                fputcsv($out, ['summary', 'paid_appointments', $summary['paid_appointments']]);

                fputcsv($out, []);
                fputcsv($out, ['By Barber']);
                fputcsv($out, [
                    'barber_user_id',
                    'barber_name',
                    'booked_cents',
                    'collected_cents',
                    'booked_appointments',
                ]);
                foreach ($byBarber as $row) {
                    fputcsv($out, [
                        $row['barber_user_id'],
                        $row['barber_name'],
                        $row['booked_cents'],
                        $row['collected_cents'],
                        $row['booked_appointments'],
                    ]);
                }

                fputcsv($out, []);
                fputcsv($out, ['By Service']);
                fputcsv($out, [
                    'service_id',
                    'service_name',
                    'booked_cents',
                    'collected_cents',
                    'booked_appointments',
                ]);
                foreach ($byService as $row) {
                    fputcsv($out, [
                        $row['service_id'],
                        $row['service_name'],
                        $row['booked_cents'],
                        $row['collected_cents'],
                        $row['booked_appointments'],
                    ]);
                }

                fputcsv($out, []);
                fputcsv($out, ['Series']);
                fputcsv($out, [
                    'bucket',
                    'booked_cents',
                    'collected_cents',
                    'booked_appointments',
                ]);
                foreach ($series as $row) {
                    fputcsv($out, [
                        $row['bucket'],
                        $row['booked_cents'],
                        $row['collected_cents'],
                        $row['booked_appointments'],
                    ]);
                }

                fclose($out);
            },
            $filename,
            [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Cache-Control' => 'no-store',
            ],
        );
    }
}
