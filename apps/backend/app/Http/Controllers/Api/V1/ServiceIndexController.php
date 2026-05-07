<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ServiceIndexController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        return ServiceResource::collection(
            Service::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        );
    }
}
