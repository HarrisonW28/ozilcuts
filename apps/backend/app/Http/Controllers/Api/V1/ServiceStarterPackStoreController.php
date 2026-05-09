<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Catalog\ServiceStarterPackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ServiceStarterPackStoreController extends Controller
{
    public function __invoke(Request $request, ServiceStarterPackService $starterPack): JsonResponse
    {
        if ($request->user() === null || ! $request->user()->isAdmin()) {
            abort(403);
        }

        $result = $starterPack->apply();

        return response()->json([
            'created' => $result['created'],
            'skipped_slugs' => $result['skipped'],
        ]);
    }
}
