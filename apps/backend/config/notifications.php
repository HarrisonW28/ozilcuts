<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Retention notifications
    |--------------------------------------------------------------------------
    |
    | Timing knobs for the smart-rebook + inactivity nudges. Every value can
    | be overridden via the matching env var so a shop can tune cadence
    | without code changes.
    |
    | - rebook.lead_days: how far ahead of the predicted "due" date we may
    |   still send the rebook nudge. 0 means dispatch only on/after the
    |   suggested date; larger values let us nudge a touch ahead.
    |
    | - inactivity.multiplier: a customer is considered lapsed when more
    |   days than (multiplier × interval_days) have passed since their last
    |   confirmed appointment with no upcoming booking.
    |
    | - inactivity.absolute_min_days: floor for the lapsed threshold so we
    |   don't nudge customers whose interval is unusually short. Always at
    |   least this many days past the last visit before the inactivity
    |   nudge fires.
    |
    | - inactivity.absolute_max_days: optional upper bound (0 = disabled).
    |   When > 0, skip inactivity nudges when the last visit is older than
    |   this many days (stale records / long-dormant customers).
    |
    | - cooldown_days: a customer who already received any retention nudge
    |   (rebook or inactivity) within this many days is skipped on the next
    |   dispatch run — prevents stacking emails when a customer happens to
    |   trip multiple thresholds in the same week.
    |
    */

    'retention' => [

        'rebook' => [
            'lead_days' => (int) env('RETENTION_REBOOK_LEAD_DAYS', 1),
        ],

        'inactivity' => [
            'multiplier' => (float) env('RETENTION_INACTIVITY_MULTIPLIER', 2.0),
            'absolute_min_days' => (int) env('RETENTION_INACTIVITY_MIN_DAYS', 45),
            'absolute_max_days' => (int) env('RETENTION_INACTIVITY_MAX_DAYS', 0),
        ],

        'cooldown_days' => (int) env('RETENTION_COOLDOWN_DAYS', 14),
    ],

];
