<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\StoreServiceRequest;
use App\Http\Resources\ServiceManageResource;
use App\Services\Catalog\ServiceManagementService;
use Illuminate\Http\JsonResponse;

final class ServiceManageStoreController extends Controller
{
    public function __invoke(StoreServiceRequest $request, ServiceManagementService $services): JsonResponse
    {
        $service = $services->create($request->validated());

        return response()->json(
            (new ServiceManageResource($service))->toArray($request),
            201,
        );
    }
}
