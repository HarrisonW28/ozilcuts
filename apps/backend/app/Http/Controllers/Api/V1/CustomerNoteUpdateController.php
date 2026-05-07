<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCustomerNoteRequest;
use App\Http\Resources\CustomerNoteResource;
use App\Models\CustomerNote;
use App\Services\Customers\CustomerNoteService;
use Illuminate\Http\JsonResponse;

final class CustomerNoteUpdateController extends Controller
{
    public function __invoke(
        UpdateCustomerNoteRequest $request,
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

        $note = $service->update($note, $request->validated());

        return response()->json((new CustomerNoteResource($note))->toArray($request));
    }
}
