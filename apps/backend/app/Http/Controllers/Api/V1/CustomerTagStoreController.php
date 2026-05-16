<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerTagRequest;
use App\Http\Resources\CustomerTagResource;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Customers\CustomerTagService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use RuntimeException;

final class CustomerTagStoreController extends Controller
{
    public function __invoke(
        StoreCustomerTagRequest $request,
        User $user,
        CustomerTagService $service,
        AuditLogService $audit,
    ): JsonResponse {
        $author = $request->user();
        if ($author === null) {
            abort(401);
        }

        try {
            $tag = $service->attach($user, $author, (string) $request->input('label'));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if ($tag->wasRecentlyCreated) {
            $audit->record(
                action: AuditAction::CUSTOMER_TAG_CREATED,
                actor: $author,
                request: $request,
                subjectType: 'customer_tag',
                subjectId: $tag->id,
                targetUserId: $user->id,
                metadata: ['label' => $tag->label],
            );
        }

        return response()->json(
            (new CustomerTagResource($tag))->toArray($request),
            $tag->wasRecentlyCreated ? 201 : 200,
        );
    }
}
