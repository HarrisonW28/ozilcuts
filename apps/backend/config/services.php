<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'frontend' => [
        'url' => rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    /*
    | Optional OpenAI for staff-only appointment summaries (see
    | AppointmentCustomerAiSummaryService). When unset, summaries use rules.
    */
    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'model' => env('OPENAI_SUMMARY_MODEL', 'gpt-4o-mini'),
    ],

    'stripe' => [
        'secret' => env('STRIPE_SECRET'),
        'publishable' => env('STRIPE_PUBLISHABLE_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'currency' => env('STRIPE_CURRENCY', 'gbp'),
        /*
         * Product flag for in-person tap / POS roadmap (public via /payments/config).
         * off — hide tap messaging; foundation — customer-device checkout + staff guidance;
         * live — reserved for Stripe Terminal / tap-on-device when wired.
         */
        'tap_to_pay_status' => env('STRIPE_TAP_TO_PAY_STATUS', 'foundation'),
    ],

];
