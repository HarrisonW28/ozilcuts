<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerNoteRequest;
use App\Http\Resources\CustomerNoteResource;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Customers\CustomerNoteService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class CustomerNoteStoreController extends Controller
{
    public function __invoke(
        StoreCustomerNoteRequest $request,
        User $user,
        CustomerNoteService $service,
    ): JsonResponse {
        $this->authorize('manageStaffCrm', $user);

        $author = $request->user();
        if ($author === null) {
            abort(401);
        }

        try {
            $note = $service->create($user, $author, $request->validated());
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $audit->record(
            action: AuditAction::CUSTOMER_NOTE_CREATED,
            actor: $author,
            request: $request,
            subjectType: 'customer_note',
            subjectId: $note->id,
            targetUserId: $user->id,
        );

        return response()->json(
            (new CustomerNoteResource($note))->toArray($request),
            201,
        );
    }
}
