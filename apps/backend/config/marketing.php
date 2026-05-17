<?php

return [

    'hero_video' => [
        'max_kilobytes' => (int) env('MARKETING_HERO_VIDEO_MAX_KB', 51200),
        'allowed_mimes' => ['video/mp4', 'video/webm'],
        'allowed_extensions' => ['mp4', 'webm'],
    ],

    'hero_poster' => [
        'max_kilobytes' => (int) env('MARKETING_HERO_POSTER_MAX_KB', 5120),
    ],

    'logo' => [
        'max_kilobytes' => (int) env('MARKETING_LOGO_MAX_KB', 2048),
    ],

    /** Used on the public site when the admin has not set a handle yet. */
    'default_instagram_handle' => env('MARKETING_DEFAULT_INSTAGRAM_HANDLE', 'ozil.cuts'),

];
