<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceManageResource;
use App\Models\Service;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ServiceManageIndexController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Service::class);

        return ServiceManageResource::collection(
            Service::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->paginate(15),
        );
    }
}
