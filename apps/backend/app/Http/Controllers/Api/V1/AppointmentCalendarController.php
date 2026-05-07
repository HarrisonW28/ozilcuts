<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Booking\AppointmentIcsBuilder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AppointmentCalendarController extends Controller
{
    public function __invoke(
        Request $request,
        Appointment $appointment,
        AppointmentIcsBuilder $builder,
    ): Response {
        // The route runs behind the `signed` middleware so the URL itself
        // proves the requester was authorised to download.
        $host = parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'ozilcuts.local';
        $body = $builder->build($appointment, $host);

        $filename = sprintf('ozilcuts-appointment-%d.ics', $appointment->id);

        return response($body, 200, [
            'Content-Type' => 'text/calendar; charset=UTF-8',
            'Content-Disposition' => sprintf('attachment; filename="%s"', $filename),
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
