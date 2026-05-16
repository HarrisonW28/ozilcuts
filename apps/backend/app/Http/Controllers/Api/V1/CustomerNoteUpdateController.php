<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCustomerNoteRequest;
use App\Http\Resources\CustomerNoteResource;
use App\Models\CustomerNote;
use App\Services\Audit\AuditLogService;
use App\Services\Customers\CustomerNoteService;
use App\Support\AuditAction;
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

        $this->authorize('update', $note);

        $validated = $request->validated();
        $note = $service->update($note, $validated);

        $audit->record(
            action: AuditAction::CUSTOMER_NOTE_UPDATED,
            actor: $user,
            request: $request,
            subjectType: 'customer_note',
            subjectId: $note->id,
            targetUserId: $note->customer_user_id,
            metadata: ['fields' => array_keys($validated)],
        );

        return response()->json((new CustomerNoteResource($note))->toArray($request));
    }
}
