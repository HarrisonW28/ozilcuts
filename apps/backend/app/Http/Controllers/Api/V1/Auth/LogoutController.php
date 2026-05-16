<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Services\Audit\AuditLogService;
use App\Support\AuditAction;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Laravel\Sanctum\PersonalAccessToken;

final class LogoutController extends Controller
{
    public function __invoke(Request $request, AuditLogService $audit): Response
    {
        $user = $request->user();
        $plain = $request->bearerToken();
        if ($plain !== null) {
            $accessToken = PersonalAccessToken::findToken($plain);
            if ($accessToken !== null && $user !== null && $accessToken->tokenable()->is($user)) {
                $accessToken->delete();
            }
        }

        if ($user !== null) {
            if ($user->hasRole(Role::SLUG_ADMIN, Role::SLUG_BARBER)) {
                $user->loadMissing('role');
                $audit->record(
                    action: AuditAction::AUTH_LOGOUT,
                    actor: $user,
                    request: $request,
                    metadata: ['role' => (string) $user->role?->slug],
                );
            }

            $user->tokens()->delete();
        }

        return response()->noContent();
    }
}
