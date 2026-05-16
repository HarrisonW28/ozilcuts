<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Services\Audit\AuditLogService;
use App\Support\AuditAction;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class ServiceManageDestroyController extends Controller
{
    public function __invoke(
        Request $request,
        Service $service,
        AuditLogService $audit,
    ): Response {
        $this->authorize('delete', $service);

        $audit->record(
            action: AuditAction::SERVICE_DELETED,
            actor: $request->user(),
            request: $request,
            subjectType: 'service',
            subjectId: $service->id,
            metadata: ['name' => $service->name, 'slug' => $service->slug],
        );

        $service->delete();

        return response()->noContent();
    }
}
