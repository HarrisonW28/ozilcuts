<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminAuditLogIndexRequest;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;

final class AdminAuditLogIndexController extends Controller
{
    public function __invoke(AdminAuditLogIndexRequest $request): JsonResponse
    {
        $perPage = max(10, min(80, (int) config('audit.index_per_page', 40)));

        $q = AuditLog::query()
            ->with(['actor:id,name,email', 'targetUser:id,name,email'])
            ->orderByDesc('id');

        if ($request->filled('category')) {
            $q->where('category', (string) $request->validated('category'));
        }

        if ($request->filled('action')) {
            $q->where('action', (string) $request->validated('action'));
        }

        if ($request->filled('actor_user_id')) {
            $q->where('actor_user_id', (int) $request->validated('actor_user_id'));
        }

        if ($request->filled('severity')) {
            $q->where('severity', (string) $request->validated('severity'));
        }

        if ($request->filled('from')) {
            $q->where('created_at', '>=', $request->date('from')->startOfDay());
        }

        if ($request->filled('to')) {
            $q->where('created_at', '<=', $request->date('to')->endOfDay());
        }

        $paginator = $q->paginate($perPage);

        return response()->json([
            'data' => AuditLogResource::collection($paginator->items())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
