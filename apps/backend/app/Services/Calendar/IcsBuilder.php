<?php

namespace App\Services\Calendar;

use App\Models\Appointment;
use Carbon\CarbonImmutable;

/**
 * Build minimal RFC 5545 .ics payloads for appointments. Output is
 * suitable for attaching to confirmation / reschedule emails so that
 * customers can drop the booking into their calendar with one click.
 */
final class IcsBuilder
{
    public const MIME = 'text/calendar; charset=utf-8; method=REQUEST';

    public const FILENAME = 'ozilcuts-appointment.ics';

    /**
     * Produce the ICS body for a single appointment. The appointment must
     * be loaded with service + barber + customer relationships so the
     * summary/location/description copy can be populated.
     */
    public static function forAppointment(Appointment $appointment, ?string $sequence = null): string
    {
        $start = $appointment->starts_at !== null
            ? CarbonImmutable::parse((string) $appointment->starts_at)
            : null;
        $end = $appointment->ends_at !== null
            ? CarbonImmutable::parse((string) $appointment->ends_at)
            : ($start?->addMinutes((int) ($appointment->service?->duration_minutes ?? 30)));

        $brand = (string) config('brand.name', 'Ozilcuts');
        $serviceName = (string) ($appointment->service?->name ?? 'Appointment');
        $barberName = (string) ($appointment->barber?->name ?? 'your barber');
        $customerEmail = (string) ($appointment->customer?->email ?? '');
        $organizerEmail = (string) (config('mail.from.address') ?? 'noreply@ozilcuts.test');

        $uid = sprintf('appointment-%d@%s',
            (int) $appointment->id,
            self::hostFromUrl((string) config('brand.website_url', 'ozilcuts.test')),
        );
        $stamp = self::formatUtc(CarbonImmutable::now('UTC'));
        $startStr = $start !== null ? self::formatUtc($start->utc()) : $stamp;
        $endStr = $end !== null ? self::formatUtc($end->utc()) : $stamp;

        $summary = self::escape("{$brand}: {$serviceName} with {$barberName}");
        $description = self::escape(sprintf(
            "Booking with %s for %s.\n\nManage this appointment: %s",
            $barberName,
            $serviceName,
            rtrim((string) config('brand.website_url'), '/').'/appointments/'.((int) $appointment->id).'/confirmation',
        ));
        $location = self::escape((string) config('brand.address', $brand));
        $sequenceLine = 'SEQUENCE:'.($sequence ?? '0');

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//'.$brand.'//Bookings//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            'UID:'.$uid,
            'DTSTAMP:'.$stamp,
            'DTSTART:'.$startStr,
            'DTEND:'.$endStr,
            $sequenceLine,
            'STATUS:'.($appointment->status === Appointment::STATUS_CANCELLED ? 'CANCELLED' : 'CONFIRMED'),
            'SUMMARY:'.$summary,
            'DESCRIPTION:'.$description,
            'LOCATION:'.$location,
            'ORGANIZER;CN='.self::escape($brand).':MAILTO:'.$organizerEmail,
        ];
        if ($customerEmail !== '') {
            $lines[] = 'ATTENDEE;CN='.self::escape((string) ($appointment->customer?->name ?? ''))
                .';RSVP=FALSE:MAILTO:'.$customerEmail;
        }
        $lines[] = 'END:VEVENT';
        $lines[] = 'END:VCALENDAR';

        // RFC 5545 requires CRLF line endings.
        return implode("\r\n", $lines)."\r\n";
    }

    private static function formatUtc(CarbonImmutable $when): string
    {
        return $when->utc()->format('Ymd\THis\Z');
    }

    private static function escape(string $value): string
    {
        return str_replace(
            ['\\', ',', ';', "\n", "\r"],
            ['\\\\', '\\,', '\\;', '\\n', ''],
            $value,
        );
    }

    private static function hostFromUrl(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : 'ozilcuts.test';
    }
}
