<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Marketing\ShopMarketingService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves shop marketing uploads through the API so logos/videos work without
 * `public/storage` symlinks (common gap on PaaS and split Vercel + API deploys).
 */
final class PublicMarketingAssetController extends Controller
{
    public function __invoke(Request $request, ShopMarketingService $marketing): StreamedResponse
    {
        $path = $request->query('f');
        if (! is_string($path)) {
            abort(404);
        }

        return $marketing->streamPublicAsset($path);
    }
}
