<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\UpdateServiceRequest;
use App\Http\Resources\ServiceManageResource;
use App\Models\Service;
use App\Services\Audit\AuditLogService;
use App\Services\Catalog\ServiceManagementService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;

final class ServiceManageUpdateController extends Controller
{
    public function __invoke(
        UpdateServiceRequest $request,
        Service $service,
        ServiceManagementService $services,
        AuditLogService $audit,
    ): JsonResponse {
        $validated = $request->validated();
        $updated = $services->update($service, $validated);

        $audit->record(
            action: AuditAction::SERVICE_UPDATED,
            actor: $request->user(),
            request: $request,
            subjectType: 'service',
            subjectId: $service->id,
            metadata: ['fields' => array_keys($validated)],
        );

        return response()->json((new ServiceManageResource($updated))->toArray($request));
    }
}
