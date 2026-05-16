<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeleteCustomerAccountRequest;
use App\Services\Audit\AuditLogService;
use App\Services\Customers\CustomerPrivacyService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class CustomerPrivacyDeleteController extends Controller
{
    public function __invoke(
        DeleteCustomerAccountRequest $request,
        CustomerPrivacyService $privacy,
        AuditLogService $audit,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $userId = $user->id;
        $email = $user->email;

        try {
            $privacy->deleteAccount($user, (string) $request->validated('confirmation'));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $audit->record(
            action: AuditAction::CUSTOMER_ACCOUNT_DELETED,
            actor: null,
            request: $request,
            subjectType: 'user',
            subjectId: $userId,
            targetUserId: $userId,
            metadata: ['email' => $email, 'self_service' => true],
        );

        return response()->json(['deleted' => true]);
    }
}
