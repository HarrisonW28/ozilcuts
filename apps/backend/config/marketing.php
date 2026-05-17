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

];
