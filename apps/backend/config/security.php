<?php

return [

    /*
    |--------------------------------------------------------------------------
    | API rate limits (requests per minute)
    |--------------------------------------------------------------------------
    */

    'rate_limits' => [
        'auth' => (int) env('SECURITY_AUTH_RATE_LIMIT', 10),
        'authenticated_api' => (int) env('SECURITY_AUTHENTICATED_API_RATE_LIMIT', 240),
        'public_api' => (int) env('SECURITY_PUBLIC_API_RATE_LIMIT', 120),
    ],

    /*
    |--------------------------------------------------------------------------
    | Production deployment
    |--------------------------------------------------------------------------
    */

    'production' => [
        'force_https' => (bool) env('SECURITY_FORCE_HTTPS', false),
        'trusted_proxies' => env('SECURITY_TRUSTED_PROXIES', ''),
        'allowed_frontend_origins' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('CORS_ALLOWED_ORIGINS', env('FRONTEND_URL', ''))),
        ))),
    ],

    /*
    |--------------------------------------------------------------------------
    | Auth hardening
    |--------------------------------------------------------------------------
    */

    'auth' => [
        'max_password_length' => (int) env('SECURITY_MAX_PASSWORD_LENGTH', 128),
        'min_sanctum_expiration_minutes' => (int) env('SECURITY_MIN_TOKEN_EXPIRATION_MINUTES', 60),
        'max_sanctum_expiration_minutes' => (int) env('SECURITY_MAX_TOKEN_EXPIRATION_MINUTES', 525600),
    ],

    /*
    |--------------------------------------------------------------------------
    | Media / upload limits (hair profile & appointment photos)
    |--------------------------------------------------------------------------
    */

    'uploads' => [
        'max_kilobytes' => (int) env('SECURITY_UPLOAD_MAX_KB', 5120),
        'max_width' => (int) env('SECURITY_UPLOAD_MAX_WIDTH', 8000),
        'max_height' => (int) env('SECURITY_UPLOAD_MAX_HEIGHT', 8000),
        'allowed_mimes' => ['image/jpeg', 'image/png', 'image/webp'],
        'allowed_extensions' => ['jpg', 'jpeg', 'png', 'webp'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Response headers (see SecurityHeaders middleware)
    |--------------------------------------------------------------------------
    */

    'headers' => [
        'enable_csp' => (bool) env('SECURITY_ENABLE_CSP', true),
    ],

];
