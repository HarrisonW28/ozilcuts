<?php

return [
    'name' => env('BRAND_NAME', 'Ozilcuts'),
    'tagline' => env('BRAND_TAGLINE', 'Sharp cuts, on schedule.'),
    'support_email' => env('BRAND_SUPPORT_EMAIL', env('MAIL_FROM_ADDRESS', 'support@ozilcuts.test')),
    // Free-form, used in mail footers. Multi-line strings are fine.
    'address' => env('BRAND_ADDRESS', '123 Ozil Cuts St, Sydney NSW 2000'),
    'website_url' => env('BRAND_WEBSITE_URL', env('FRONTEND_URL', 'http://localhost:3000')),
    // Inline mail accent. Anything that ends up in CSS is fine.
    'accent_color' => env('BRAND_ACCENT_COLOR', '#18181b'),
];
