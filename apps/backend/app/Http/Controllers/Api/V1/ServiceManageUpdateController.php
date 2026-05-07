<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\UpdateServiceRequest;
use App\Http\Resources\ServiceManageResource;
use App\Models\Service;
use App\Services\Catalog\ServiceManagementService;
use Illuminate\Http\JsonResponse;

final class ServiceManageUpdateController extends Controller
{
    public function __invoke(
        UpdateServiceRequest $request,
        Service $service,
        ServiceManagementService $services,
    ): JsonResponse {
        $updated = $services->update($service, $request->validated());

        return response()->json((new ServiceManageResource($updated))->toArray($request));
    }
}
