<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\StoreServiceRequest;
use App\Http\Resources\ServiceManageResource;
use App\Services\Audit\AuditLogService;
use App\Services\Catalog\ServiceManagementService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;

final class ServiceManageStoreController extends Controller
{
    public function __invoke(
        StoreServiceRequest $request,
        ServiceManagementService $services,
        AuditLogService $audit,
    ): JsonResponse {
        $service = $services->create($request->validated());

        $audit->record(
            action: AuditAction::SERVICE_CREATED,
            actor: $request->user(),
            request: $request,
            subjectType: 'service',
            subjectId: $service->id,
            metadata: ['name' => $service->name, 'slug' => $service->slug],
        );

        return response()->json(
            (new ServiceManageResource($service))->toArray($request),
            201,
        );
    }
}
