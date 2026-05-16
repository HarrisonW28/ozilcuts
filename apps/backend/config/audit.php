<?php

return [

    'enabled' => (bool) env('AUDIT_LOG_ENABLED', true),

    'index_per_page' => (int) env('AUDIT_LOG_PER_PAGE', 40),

];
