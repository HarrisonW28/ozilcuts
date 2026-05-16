<?php

namespace App\Console\Commands;

use App\Services\Security\ProductionReadinessService;
use Illuminate\Console\Command;

final class SecurityProductionReviewCommand extends Command
{
    protected $signature = 'security:production-review {--json : Output raw JSON}';

    protected $description = 'Run automated production security readiness checks';

    public function handle(ProductionReadinessService $readiness): int
    {
        $report = $readiness->review();

        if ($this->option('json')) {
            $this->line((string) json_encode($report, JSON_PRETTY_PRINT));

            return $report['overall_status'] === 'fail' ? self::FAILURE : self::SUCCESS;
        }

        $this->info('Production security review — '.$report['overall_status']);
        $this->line('Environment: '.$report['environment']);
        $this->newLine();

        foreach ($report['sections'] as $section) {
            $this->components->twoColumnDetail(
                '<fg=cyan>'.$section['title'].'</> ['.$section['status'].']',
                '',
            );
            foreach ($section['items'] as $item) {
                $mark = match ($item['status']) {
                    'pass' => '<fg=green>✓</>',
                    'warn' => '<fg=yellow>!</>',
                    default => '<fg=red>✗</>',
                };
                $this->line("  {$mark} {$item['label']}: {$item['detail']}");
            }
            $this->newLine();
        }

        $this->line('Manual: '.$report['manual_review']['penetration_checklist']);
        $this->line('Deploy: '.$report['manual_review']['deployment_guide']);

        return $report['overall_status'] === 'fail' ? self::FAILURE : self::SUCCESS;
    }
}
