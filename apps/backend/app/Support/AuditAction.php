<?php

namespace App\Support;

/**
 * Canonical audit action slugs for privileged and security events.
 */
final class AuditAction
{
    public const CATEGORY_SECURITY = 'security';

    public const CATEGORY_PRIVILEGED = 'privileged';

    public const CATEGORY_OPERATIONAL = 'operational';

    public const SEVERITY_INFO = 'info';

    public const SEVERITY_WARNING = 'warning';

    public const SEVERITY_CRITICAL = 'critical';

    public const AUTH_LOGIN_SUCCESS = 'auth.login.success';

    public const AUTH_LOGIN_FAILED = 'auth.login.failed';

    public const AUTH_LOGOUT = 'auth.logout';

    public const BARBER_CREATED = 'barber.created';

    public const BARBER_PROFILE_UPDATED = 'barber.profile.updated';

    public const BARBER_AVAILABILITY_REPLACED = 'barber.availability.replaced';

    public const SERVICE_CREATED = 'service.created';

    public const SERVICE_UPDATED = 'service.updated';

    public const SERVICE_DELETED = 'service.deleted';

    public const SHOP_ONBOARDING_UPDATED = 'shop.onboarding.updated';

    public const CUSTOMER_VIP_UPDATED = 'customer.vip.updated';

    public const CUSTOMER_TAG_CREATED = 'customer.tag.created';

    public const CUSTOMER_TAG_DELETED = 'customer.tag.deleted';

    public const CUSTOMER_NOTE_CREATED = 'customer.note.created';

    public const CUSTOMER_NOTE_UPDATED = 'customer.note.updated';

    public const CUSTOMER_NOTE_DELETED = 'customer.note.deleted';

    public const CUSTOMER_ACCOUNT_DELETED = 'customer.account.deleted';

    public const APPOINTMENT_CANCELLED_BY_STAFF = 'appointment.cancelled_by_staff';

    public const APPOINTMENT_BOOKED_BY_STAFF = 'appointment.booked_by_staff';

    /**
     * @return array{category: string, severity: string}
     */
    public static function defaultsFor(string $action): array
    {
        return match (true) {
            str_starts_with($action, 'auth.login.failed') => [
                'category' => self::CATEGORY_SECURITY,
                'severity' => self::SEVERITY_WARNING,
            ],
            str_starts_with($action, 'auth.') => [
                'category' => self::CATEGORY_SECURITY,
                'severity' => self::SEVERITY_INFO,
            ],
            str_starts_with($action, 'customer.account.deleted') => [
                'category' => self::CATEGORY_SECURITY,
                'severity' => self::SEVERITY_CRITICAL,
            ],
            str_starts_with($action, 'barber.created') => [
                'category' => self::CATEGORY_PRIVILEGED,
                'severity' => self::SEVERITY_WARNING,
            ],
            str_starts_with($action, 'shop.') => [
                'category' => self::CATEGORY_PRIVILEGED,
                'severity' => self::SEVERITY_INFO,
            ],
            default => [
                'category' => self::CATEGORY_PRIVILEGED,
                'severity' => self::SEVERITY_INFO,
            ],
        };
    }
}
