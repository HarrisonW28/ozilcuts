<?php

namespace App\Services\Booking;

use App\Models\Appointment;
use Carbon\CarbonImmutable;

/**
 * Builds an RFC 5545 VCALENDAR/VEVENT body for an appointment so customers
 * (and barbers) can download the booking into their personal calendar.
 *
 * Output uses CRLF line endings as required by the spec.
 */
final class AppointmentIcsBuilder
{
    public function build(Appointment $appointment, string $hostForUid): string
    {
        $appointment->loadMissing(['service', 'barber']);

        $start = CarbonImmutable::parse((string) $appointment->starts_at)->utc();
        $end = CarbonImmutable::parse((string) $appointment->ends_at)->utc();
        $stamp = CarbonImmutable::now('UTC');

        $serviceName = $appointment->service?->name ?? 'Appointment';
        $barberName = $appointment->barber?->name ?? null;
        $summary = $barberName !== null
            ? sprintf('%s with %s', $serviceName, $barberName)
            : $serviceName;

        $description = $appointment->notes !== null && trim((string) $appointment->notes) !== ''
            ? trim((string) $appointment->notes)
            : ($barberName !== null
                ? sprintf('Booked with %s.', $barberName)
                : 'Booked appointment.');

        $status = $appointment->status === Appointment::STATUS_CANCELLED
            ? 'CANCELLED'
            : 'CONFIRMED';

        $uid = sprintf('appointment-%d@%s', $appointment->id, $hostForUid);

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Ozilcuts//Booking//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            'UID:'.$uid,
            'DTSTAMP:'.$stamp->format('Ymd\THis\Z'),
            'DTSTART:'.$start->format('Ymd\THis\Z'),
            'DTEND:'.$end->format('Ymd\THis\Z'),
            'SUMMARY:'.$this->escape($summary),
            'DESCRIPTION:'.$this->escape($description),
            'STATUS:'.$status,
            'SEQUENCE:'.$this->sequenceFor($appointment),
            'END:VEVENT',
            'END:VCALENDAR',
        ];

        return implode("\r\n", $lines)."\r\n";
    }

    /**
     * RFC 5545 §3.3.11 — escape backslashes, semicolons, commas, and newlines
     * inside text values.
     */
    private function escape(string $text): string
    {
        return str_replace(
            ['\\', ';', ',', "\r\n", "\n"],
            ['\\\\', '\\;', '\\,', '\\n', '\\n'],
            $text,
        );
    }

    /**
     * Increment SEQUENCE on each update so calendar clients pick up
     * reschedules/cancellations.
     */
    private function sequenceFor(Appointment $appointment): int
    {
        $updated = $appointment->updated_at;
        $created = $appointment->created_at;
        if ($updated === null || $created === null) {
            return 0;
        }

        return $updated->equalTo($created) ? 0 : 1;
    }
}
