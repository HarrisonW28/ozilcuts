<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Raised when abuse protection blocks an action. Rendered as HTTP 429 for API clients.
 */
final class AbuseBlockedException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $abuseCode = 'abuse_blocked',
        public readonly ?int $retryAfterSeconds = null,
    ) {
        parent::__construct($message);
    }
}
