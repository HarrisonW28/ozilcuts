<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Response;

final class ServiceManageDestroyController extends Controller
{
    public function __invoke(Service $service): Response
    {
        $this->authorize('delete', $service);
        $service->delete();

        return response()->noContent();
    }
}
