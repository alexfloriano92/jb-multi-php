<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'uploads/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', '*'))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 86400,
    'supports_credentials' => false,
];
