<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\Abuse\AbuseProtectionService;
use App\Services\Auth\AuthTokenIssuer;
use App\Services\Auth\AuthenticationService;
use Illuminate\Http\JsonResponse;

final class RegisterController extends Controller
{
    public function __invoke(
        RegisterRequest $request,
        AuthenticationService $auth,
        AuthTokenIssuer $tokens,
        AbuseProtectionService $abuse,
    ): JsonResponse
    {
        $abuse->assertRegistrationAttempt($request);

        $user = $auth->register(
            name: $request->validated('name'),
            email: $request->validated('email'),
            password: $request->validated('password'),
            marketingOptIn: (bool) $request->boolean('marketing_opt_in'),
        )->load('role');

        $abuse->recordRegistrationAttempt($request);

        $token = $tokens->issue($user);

        return response()->json([
            'user' => (new UserResource($user))->toArray($request),
            'token' => $token,
        ], 201);
    }
}
