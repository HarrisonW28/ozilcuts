<?php

namespace App\Services\Reports;

use App\Models\Appointment;
use App\Models\Role;
use App\Models\User;
use App\Services\Notifications\SmartRebookNudgeService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Staff-only operational intelligence: staffing, busy windows, no-show proxy,
 * and retention pressure — rules-first with optional OpenAI polish on aggregate
 * metrics only (no customer identifiers).
 */
final class OperationalAiInsightsService
{
    public function __construct(
        private readonly SmartRebookNudgeService $rebookNudges,
    ) {}

    /**
     * @param  array{
     *     today: array<string, mixed>,
     *     week: array<string, mixed>,
     *     range: array{from: string, to: string},
     *     peak_heatmap: list<array{weekday: int, weekday_label: string, hour: int, count: int}>,
     *     booking_lead_time: list<array{label: string, count: int}>,
     *     cancellation_lead_time: list<array{label: string, count: int}>,
     * }  $operationalSummary
     * @return array{
     *     source: 'model'|'rules',
     *     generated_at: string,
     *     privacy: array{staff_only: string, third_party: string|null},
     *     staffing: array{
     *         title: string,
     *         summary: string,
     *         actions: list<string>,
     *         confidence: 'low'|'medium'|'high',
     *         metrics?: array<string, int|float|string>,
     *     },
     *     busy_periods: array{
     *         title: string,
     *         summary: string,
     *         actions: list<string>,
     *         confidence: 'low'|'medium'|'high',
     *         metrics?: array<string, int|float|string>,
     *     },
     *     no_shows: array{
     *         title: string,
     *         summary: string,
     *         actions: list<string>,
     *         confidence: 'low'|'medium'|'high',
     *         metrics?: array<string, int|float|string>,
     *     },
     *     retention: array{
     *         title: string,
     *         summary: string,
     *         actions: list<string>,
     *         confidence: 'low'|'medium'|'high',
     *         metrics?: array<string, int|float|string>,
     *     },
     * }
     */
    public function build(
        CarbonImmutable $now,
        CarbonImmutable $from,
        CarbonImmutable $to,
        array $operationalSummary,
    ): array {
        $privacy = [
            'staff_only' => 'These insights are for shop admins only. Do not export or share outside the business.',
            'third_party' => $this->thirdPartyPrivacyLine(),
        ];

        $barbers = $this->barberHeadcount();
        $heatmap = $operationalSummary['peak_heatmap'];
        $topPeaks = $this->topHeatmapCells($heatmap, 6);
        $totalHeat = $this->heatmapTotal($heatmap);
        $noShow = $this->noShowLikeStats($now, $from, $to);
        $lateCancelShare = $this->lateCancellationShare($operationalSummary['cancellation_lead_time']);
        $retention = $this->rebookNudges->retentionSnapshot($now);
        $retentionMetrics = $this->retentionMetrics($retention);

        $ctx = [
            'as_of' => $now->toIso8601String(),
            'range' => $operationalSummary['range'],
            'barber_headcount' => $barbers,
            'week_cancel_rate' => (float) ($operationalSummary['week']['cancel_rate'] ?? 0.0),
            'heatmap_total_confirmed' => $totalHeat,
            'top_peak_windows' => array_map(
                fn (array $c) => [
                    'weekday_label' => $c['weekday_label'],
                    'hour' => $c['hour'],
                    'count' => $c['count'],
                ],
                $topPeaks,
            ),
            'no_show_proxy' => $noShow,
            'late_cancel_under_24h_share' => $lateCancelShare,
            'retention' => $retentionMetrics,
        ];

        $rules = $this->rulesCards($ctx, $topPeaks, $noShow, $retentionMetrics, $lateCancelShare, $barbers, $totalHeat);

        $apiKey = config('services.openai.api_key');
        if (! is_string($apiKey) || trim($apiKey) === '') {
            return $this->wrapPayload('rules', $privacy, $rules, $now);
        }

        $modelCards = $this->tryOpenAiCards($ctx, $apiKey);
        if ($modelCards !== null) {
            $modelCards = $this->mergeInsightMetrics($modelCards, $rules);

            return $this->wrapPayload('model', $privacy, $modelCards, $now);
        }

        return $this->wrapPayload('rules', $privacy, $rules, $now);
    }

    /**
     * @param  array{
     *     staffing: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     busy_periods: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     no_shows: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     retention: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     * }  $cards
     * @return array<string, mixed>
     */
    private function wrapPayload(string $source, array $privacy, array $cards, CarbonImmutable $now): array
    {
        return [
            'source' => $source,
            'generated_at' => $now->toIso8601String(),
            'privacy' => $privacy,
            'staffing' => $cards['staffing'],
            'busy_periods' => $cards['busy_periods'],
            'no_shows' => $cards['no_shows'],
            'retention' => $cards['retention'],
        ];
    }

    private function thirdPartyPrivacyLine(): ?string
    {
        $openaiKey = config('services.openai.api_key');

        return is_string($openaiKey) && trim($openaiKey) !== ''
            ? 'When AI is enabled, aggregate shop metrics (counts and rates only — no customer names or emails) may be processed by the configured model provider to tighten wording.'
            : null;
    }

    private function barberHeadcount(): int
    {
        return (int) User::query()
            ->whereHas('role', fn ($q) => $q->where('slug', Role::SLUG_BARBER))
            ->count();
    }

    /**
     * @param  list<array{weekday: int, weekday_label: string, hour: int, count: int}>  $heatmap
     * @return list<array{weekday: int, weekday_label: string, hour: int, count: int}>
     */
    private function topHeatmapCells(array $heatmap, int $limit): array
    {
        $cells = $heatmap;
        usort($cells, fn (array $a, array $b) => $b['count'] <=> $a['count']);

        return array_slice(array_values(array_filter(
            $cells,
            fn (array $c) => $c['count'] > 0,
        )), 0, $limit);
    }

    /**
     * @param  list<array{weekday: int, weekday_label: string, hour: int, count: int}>  $heatmap
     */
    private function heatmapTotal(array $heatmap): int
    {
        $sum = 0;
        foreach ($heatmap as $c) {
            $sum += (int) $c['count'];
        }

        return $sum;
    }

    /**
     * Proxy: confirmed visits whose slot has ended, still marked arrival expected.
     *
     * @return array{completed: int, no_show_like: int, rate: float|null}
     */
    private function noShowLikeStats(CarbonImmutable $now, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rangeEnd = $to->endOfDay();
        $cutoff = $now->lessThan($rangeEnd) ? $now : $rangeEnd;

        $base = Appointment::query()
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('arrival_state', Appointment::ARRIVAL_EXPECTED)
            ->whereBetween('ends_at', [$from->startOfDay(), $cutoff]);

        $noShowLike = (int) (clone $base)->count();

        $completed = (int) Appointment::query()
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereBetween('ends_at', [$from->startOfDay(), $cutoff])
            ->count();

        $rate = $completed > 0 ? round($noShowLike / $completed, 4) : null;

        return [
            'completed' => $completed,
            'no_show_like' => $noShowLike,
            'rate' => $rate,
        ];
    }

    /**
     * Share of cancellations with <24h notice (first two buckets).
     *
     * @param  list<array{label: string, count: int}>  $buckets
     */
    private function lateCancellationShare(array $buckets): ?float
    {
        if (count($buckets) < 2) {
            return null;
        }
        $late = (int) ($buckets[0]['count'] ?? 0) + (int) ($buckets[1]['count'] ?? 0);
        $total = 0;
        foreach ($buckets as $b) {
            $total += (int) ($b['count'] ?? 0);
        }
        if ($total === 0) {
            return null;
        }

        return round($late / $total, 4);
    }

    /**
     * @param  array{due_soon: list<array<string, mixed>>, inactive_eligible: list<array<string, mixed>>}  $snapshot
     * @return array{
     *     due_soon: int,
     *     inactive_eligible: int,
     *     due_soon_paused: int,
     *     inactive_paused: int,
     * }
     */
    private function retentionMetrics(array $snapshot): array
    {
        $due = $snapshot['due_soon'] ?? [];
        $inactive = $snapshot['inactive_eligible'] ?? [];
        $duePaused = 0;
        foreach ($due as $row) {
            if (! empty($row['retention_paused'])) {
                $duePaused++;
            }
        }
        $inactivePaused = 0;
        foreach ($inactive as $row) {
            if (! empty($row['retention_paused'])) {
                $inactivePaused++;
            }
        }

        return [
            'due_soon' => count($due),
            'inactive_eligible' => count($inactive),
            'due_soon_paused' => $duePaused,
            'inactive_paused' => $inactivePaused,
        ];
    }

    /**
     * @param  list<array{weekday: int, weekday_label: string, hour: int, count: int}>  $topPeaks
     * @param  array{completed: int, no_show_like: int, rate: float|null}  $noShow
     * @param  array{due_soon: int, inactive_eligible: int, due_soon_paused: int, inactive_paused: int}  $retentionMetrics
     * @return array{
     *     staffing: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     busy_periods: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     no_shows: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     retention: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     * }
     */
    private function rulesCards(
        array $ctx,
        array $topPeaks,
        array $noShow,
        array $retentionMetrics,
        ?float $lateCancelShare,
        int $barbers,
        int $totalHeat,
    ): array {
        $staffing = $this->rulesStaffing($topPeaks, $barbers, $totalHeat);
        $busy = $this->rulesBusyPeriods($topPeaks, $totalHeat);
        $ns = $this->rulesNoShows($noShow, $lateCancelShare);
        $ret = $this->rulesRetention($retentionMetrics);

        return [
            'staffing' => $staffing,
            'busy_periods' => $busy,
            'no_shows' => $ns,
            'retention' => $ret,
        ];
    }

    /**
     * @param  list<array{weekday: int, weekday_label: string, hour: int, count: int}>  $topPeaks
     * @return array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>}
     */
    private function rulesStaffing(array $topPeaks, int $barbers, int $totalHeat): array
    {
        if ($totalHeat === 0) {
            return [
                'title' => 'Staffing signal: quiet calendar',
                'summary' => 'There are not enough confirmed bookings in this range to infer peak load. Use a longer window once volume picks up.',
                'actions' => [
                    'Extend the reporting range after two busy weeks.',
                    'Confirm every active barber is on the roster with correct hours.',
                ],
                'confidence' => 'low',
                'metrics' => ['barbers' => $barbers, 'confirmed_in_range' => $totalHeat],
            ];
        }

        $peak = $topPeaks[0] ?? null;
        $chairs = max(1, $barbers);
        $peakLoad = $peak !== null ? round($peak['count'] / $chairs, 2) : 0.0;
        $pressure = $peakLoad >= 1.35 || ($barbers === 0 && ($peak['count'] ?? 0) >= 2);

        $peakLabel = $peak !== null
            ? $peak['weekday_label'].' '.$this->formatHour((int) $peak['hour']).' ('.$peak['count'].' bookings)'
            : 'n/a';

        $summary = $barbers === 0
            ? 'No barber-role accounts are on file, so load cannot be divided across staff. Heaviest window in the heatmap: '.$peakLabel.'.'
            : sprintf(
                'With %d barber(s) on file, the busiest single hour in this slice is %s — about %.2f× average concurrent load if visits overlap.',
                $barbers,
                $peakLabel,
                $peakLoad,
            );

        $actions = [
            'Block overlap coverage 30–60 minutes before each top window.',
            'Pre-stage walk-in buffers on adjacent slots when deposits are still pending.',
        ];
        if ($pressure) {
            array_unshift($actions, 'Add a second chair or float barber during the busiest recurring hour.');
        }
        if ($barbers === 0) {
            $actions[] = 'Create barber accounts so staffing ratios can be tracked.';
        }

        return [
            'title' => $pressure ? 'Staffing: peak pressure' : 'Staffing: balanced peaks',
            'summary' => $summary,
            'actions' => array_slice($actions, 0, 4),
            'confidence' => $totalHeat >= 40 ? 'high' : ($totalHeat >= 12 ? 'medium' : 'low'),
            'metrics' => [
                'barbers' => $barbers,
                'top_hour_bookings' => $peak['count'] ?? 0,
                'peak_load_index' => $peakLoad,
            ],
        ];
    }

    /**
     * @param  list<array{weekday: int, weekday_label: string, hour: int, count: int}>  $topPeaks
     * @return array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>}
     */
    private function rulesBusyPeriods(array $topPeaks, int $totalHeat): array
    {
        if ($totalHeat === 0) {
            return [
                'title' => 'Busy periods: no pattern yet',
                'summary' => 'The heatmap is empty for this date range. Forecasting will be meaningful once recurring bookings appear.',
                'actions' => [
                    'Revisit after a full month of operations.',
                    'Compare weekend vs weekday campaigns once data exists.',
                ],
                'confidence' => 'low',
            ];
        }

        $bits = [];
        foreach (array_slice($topPeaks, 0, 3) as $c) {
            $bits[] = $c['weekday_label'].' '.$this->formatHour((int) $c['hour']).' ('.$c['count'].')';
        }
        $top3Share = 0.0;
        if ($totalHeat > 0 && count($topPeaks) > 0) {
            $top3 = 0;
            foreach (array_slice($topPeaks, 0, 3) as $c) {
                $top3 += $c['count'];
            }
            $top3Share = round($top3 / $totalHeat, 3);
        }

        return [
            'title' => 'Busy-period forecast',
            'summary' => 'Top load concentrates on '
                .implode(', ', $bits)
                .'. Expect a similar shape next week unless marketing or hours change — '
                .sprintf('the top three windows carry about %.0f%% of volume in this slice.', $top3Share * 100),
            'actions' => [
                'Mirror last week’s staffing template onto the same weekdays.',
                'Tighten reminder timing the day before the heaviest window.',
                'Hold one contingency slot after each peak hour for overruns.',
            ],
            'confidence' => $totalHeat >= 30 ? 'high' : 'medium',
            'metrics' => ['top_three_share' => $top3Share],
        ];
    }

    /**
     * @return array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>}
     */
    private function rulesNoShows(array $noShow, ?float $lateCancelShare): array
    {
        $completed = (int) $noShow['completed'];
        $like = (int) $noShow['no_show_like'];
        $rate = $noShow['rate'];

        if ($completed === 0) {
            return [
                'title' => 'No-shows: not enough completed visits',
                'summary' => 'There are no past confirmed appointments with ended times in this window, so a no-show proxy cannot be computed.',
                'actions' => [
                    'Pick a range that includes completed appointment days.',
                    'Use arrival states consistently at check-in.',
                ],
                'confidence' => 'low',
            ];
        }

        $pct = $rate !== null ? sprintf('%.1f%%', $rate * 100) : 'n/a';
        $lateLine = $lateCancelShare !== null
            ? sprintf(' Late cancellations under 24h make up about %.0f%% of cancels in this slice.', $lateCancelShare * 100)
            : '';

        $pressure = $rate !== null && $rate >= 0.08;

        return [
            'title' => $pressure ? 'No-shows: elevated proxy' : 'No-shows: within typical band',
            'summary' => sprintf(
                'Among %d completed confirmed visits in range, %d still show as “expected” after the slot ended (%s proxy no-show rate).%s',
                $completed,
                $like,
                $pct,
                $lateLine,
            ),
            'actions' => array_values(array_filter([
                $pressure ? 'Tighten deposit or card-on-file policy for repeat no-shows.' : null,
                'Send a same-day SMS or in-app ping 2h before peak risk windows.',
                'Mark arrival as soon as guests sit — hygiene of state drives this metric.',
                $lateCancelShare !== null && $lateCancelShare >= 0.35
                    ? 'Review cancellation policy messaging; many cancels are very late.'
                    : null,
            ])),
            'confidence' => $completed >= 25 ? 'high' : ($completed >= 8 ? 'medium' : 'low'),
            'metrics' => [
                'completed_visits' => $completed,
                'no_show_proxy' => $like,
                'no_show_proxy_rate' => $rate ?? 0.0,
            ],
        ];
    }

    /**
     * @param  array{due_soon: int, inactive_eligible: int, due_soon_paused: int, inactive_paused: int}  $m
     * @return array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>}
     */
    private function rulesRetention(array $m): array
    {
        $due = (int) $m['due_soon'];
        $inactive = (int) $m['inactive_eligible'];
        $paused = (int) $m['due_soon_paused'] + (int) $m['inactive_paused'];

        if ($due + $inactive === 0) {
            return [
                'title' => 'Retention: pipeline clear',
                'summary' => 'No customers currently match due-soon or inactivity nudge rules — either cadences are healthy or eligibility filters are strict.',
                'actions' => [
                    'Spot-check inactive customers manually even when automation is quiet.',
                    'Keep booking lead-time promotions aligned with typical rebook gaps.',
                ],
                'confidence' => 'medium',
                'metrics' => $m,
            ];
        }

        return [
            'title' => 'Retention: actionable pipeline',
            'summary' => sprintf(
                'Right now %d customer(s) are due for a rebook soon and %d match inactivity outreach. %d of those rows have retention paused on the profile.',
                $due,
                $inactive,
                $paused,
            ),
            'actions' => [
                'Prioritize human follow-up for paused profiles before toggling automation.',
                'Offer anchor-weekday slots to due-soon guests to protect rhythm.',
                'Pair inactivity list with barber-specific win-back messages.',
            ],
            'confidence' => ($due + $inactive) >= 12 ? 'high' : 'medium',
            'metrics' => $m,
        ];
    }

    private function formatHour(int $hour): string
    {
        $ampm = $hour < 12 ? 'am' : 'pm';
        $h = $hour % 12 === 0 ? 12 : $hour % 12;

        return $h.$ampm;
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array{
     *     staffing: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     busy_periods: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     no_shows: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     retention: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     * }|null
     */
    private function tryOpenAiCards(array $ctx, string $apiKey): ?array
    {
        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        $base = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1'), '/');

        $userJson = json_encode($ctx, JSON_THROW_ON_ERROR);

        try {
            $response = Http::timeout(28)
                ->withToken($apiKey)
                ->acceptJson()
                ->post($base.'/chat/completions', [
                    'model' => $model,
                    'temperature' => 0.25,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => <<<'PROMPT'
You draft actionable UK-English salon operations briefings for admins. Reply with ONE JSON object containing exactly these keys: "staffing", "busy_periods", "no_shows", "retention".

Each value must be an object with:
- "title": short headline (max 52 chars)
- "summary": 1-3 sentences, plain text (max 420 chars)
- "actions": array of 2-4 short imperative strings (each max 96 chars)
- "confidence": one of "low", "medium", "high"

Each block must match its domain:
- "staffing": staffing prediction / coverage vs peak load (barber_headcount, top_peak_windows).
- "busy_periods": busy-period demand forecast from top_peak_windows and heatmap totals — when to expect chairs to fill.
- "no_shows": analysis of the no_show_proxy object (completed vs no_show_like, rate) and late_cancel_under_24h_share if relevant — operational follow-up, not blame.
- "retention": retention pipeline interpretation from the "retention" object (due_soon, inactive_eligible, paused rows).

Rules:
- Use ONLY numbers and facts present in the user JSON. Do not invent customers, revenue, or external market facts.
- Treat "no_show_proxy" as a staff metric based on arrival state hygiene — do not accuse customers by name.
- If barber_headcount is 0, recommend fixing roster data before inferring ratios.
- Never include email addresses, phone numbers, or personal names.
PROMPT,
                        ],
                        [
                            'role' => 'user',
                            'content' => 'Aggregate shop metrics JSON: '.$userJson,
                        ],
                    ],
                ]);
        } catch (\Throwable $e) {
            Log::warning('OpenAI operational insights transport failed', [
                'message' => $e->getMessage(),
            ]);

            return null;
        }

        if (! $response->successful()) {
            Log::warning('OpenAI operational insights HTTP error', [
                'status' => $response->status(),
            ]);

            return null;
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        if (! is_string($content) || trim($content) === '') {
            return null;
        }

        try {
            /** @var array<string, mixed> $decoded */
            $decoded = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return $this->normalizeFourCards($decoded);
    }

    /**
     * @param  array<string, mixed>  $decoded
     * @return array{
     *     staffing: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     busy_periods: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     no_shows: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     *     retention: array{title: string, summary: string, actions: list<string>, confidence: 'low'|'medium'|'high', metrics?: array<string, int|float|string>},
     * }|null
     */
    private function normalizeFourCards(array $decoded): ?array
    {
        $keys = ['staffing', 'busy_periods', 'no_shows', 'retention'];
        $out = [];
        foreach ($keys as $k) {
            $block = $decoded[$k] ?? null;
            if (! is_array($block)) {
                return null;
            }
            $title = isset($block['title']) && is_string($block['title']) ? trim($block['title']) : '';
            $summary = isset($block['summary']) && is_string($block['summary']) ? trim($block['summary']) : '';
            if ($title === '' || $summary === '') {
                return null;
            }
            $actionsRaw = $block['actions'] ?? [];
            if (! is_array($actionsRaw)) {
                return null;
            }
            $actions = [];
            foreach ($actionsRaw as $a) {
                if (is_string($a)) {
                    $t = trim($a);
                    if ($t !== '') {
                        $actions[] = Str::limit($t, 96, '…');
                    }
                }
            }
            if (count($actions) < 2) {
                return null;
            }
            $conf = $block['confidence'] ?? 'medium';
            if (! in_array($conf, ['low', 'medium', 'high'], true)) {
                $conf = 'medium';
            }
            $out[$k] = [
                'title' => Str::limit($title, 52, '…'),
                'summary' => Str::limit($summary, 420, '…'),
                'actions' => array_slice($actions, 0, 4),
                'confidence' => $conf,
            ];
        }

        return $out;
    }

    /**
     * Keep numeric breadcrumbs from rules while using model prose.
     *
     * @param  array{
     *     staffing: array<string, mixed>,
     *     busy_periods: array<string, mixed>,
     *     no_shows: array<string, mixed>,
     *     retention: array<string, mixed>,
     * }  $model
     * @param  array{
     *     staffing: array<string, mixed>,
     *     busy_periods: array<string, mixed>,
     *     no_shows: array<string, mixed>,
     *     retention: array<string, mixed>,
     * }  $rules
     * @return array{
     *     staffing: array<string, mixed>,
     *     busy_periods: array<string, mixed>,
     *     no_shows: array<string, mixed>,
     *     retention: array<string, mixed>,
     * }
     */
    private function mergeInsightMetrics(array $model, array $rules): array
    {
        foreach (['staffing', 'busy_periods', 'no_shows', 'retention'] as $k) {
            if (! isset($model[$k]) || ! isset($rules[$k]['metrics']) || ! is_array($rules[$k]['metrics'])) {
                continue;
            }
            $model[$k]['metrics'] = $rules[$k]['metrics'];
        }

        return $model;
    }
}
