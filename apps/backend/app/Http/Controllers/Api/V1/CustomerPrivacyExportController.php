<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Customers\CustomerPrivacyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

final class CustomerPrivacyExportController extends Controller
{
    public function __invoke(
        Request $request,
        CustomerPrivacyService $privacy,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        try {
            $export = $privacy->exportPortableData($user);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        $filename = 'ozilcuts-data-export-'.$user->id.'-'.now()->format('Y-m-d').'.json';

        return response()
            ->json($export)
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }
}
