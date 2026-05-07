<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CustomerNote;
use App\Services\Customers\CustomerNoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerNoteDestroyController extends Controller
{
    public function __invoke(
        Request $request,
        CustomerNote $note,
        CustomerNoteService $service,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        if ($note->author_user_id !== $user->id && ! $user->isAdmin()) {
            abort(403);
        }

        $service->delete($note);

        return response()->json(['deleted' => true]);
    }
}
