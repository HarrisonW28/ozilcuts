<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CustomerNote;
use App\Services\Audit\AuditLogService;
use App\Services\Customers\CustomerNoteService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerNoteDestroyController extends Controller
{
    public function __invoke(
        Request $request,
        CustomerNote $note,
        CustomerNoteService $service,
        AuditLogService $audit,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $this->authorize('delete', $note);

        $audit->record(
            action: AuditAction::CUSTOMER_NOTE_DELETED,
            actor: $user,
            request: $request,
            subjectType: 'customer_note',
            subjectId: $note->id,
            targetUserId: $note->customer_user_id,
        );

        $service->delete($note);

        return response()->json(['deleted' => true]);
    }
}
