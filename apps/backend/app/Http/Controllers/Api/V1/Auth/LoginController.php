<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Services\Audit\AuditLogService;
use App\Services\Auth\AuthTokenIssuer;
use App\Services\Auth\AuthenticationService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

final class LoginController extends Controller
{
    public function __invoke(
        LoginRequest $request,
        AuthenticationService $auth,
        AuthTokenIssuer $tokens,
        AuditLogService $audit,
    ): JsonResponse
    {
        $email = (string) $request->validated('email');

        $user = $auth->validateCredentials(
            email: $email,
            password: $request->validated('password'),
        );

        if ($user === null) {
            $audit->record(
                action: AuditAction::AUTH_LOGIN_FAILED,
                request: $request,
                metadata: ['email' => strtolower($email)],
            );

            throw ValidationException::withMessages([
                'email' => [trans('auth.failed')],
            ]);
        }

        $user->load('role');

        if ($user->hasRole(Role::SLUG_ADMIN, Role::SLUG_BARBER)) {
            $audit->record(
                action: AuditAction::AUTH_LOGIN_SUCCESS,
                actor: $user,
                request: $request,
                metadata: ['role' => (string) $user->role?->slug],
            );
        }

        $token = $tokens->issue($user);

        return response()->json([
            'user' => (new UserResource($user))->toArray($request),
            'token' => $token,
        ]);
    }
}
