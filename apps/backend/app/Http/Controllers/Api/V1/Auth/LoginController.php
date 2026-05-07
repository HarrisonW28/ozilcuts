<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\AuthenticationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

final class LoginController extends Controller
{
    public function __invoke(LoginRequest $request, AuthenticationService $auth): JsonResponse
    {
        $user = $auth->validateCredentials(
            email: $request->validated('email'),
            password: $request->validated('password'),
        );

        if ($user === null) {
            throw ValidationException::withMessages([
                'email' => [trans('auth.failed')],
            ]);
        }

        $user->load('role');

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'user' => (new UserResource($user))->toArray($request),
            'token' => $token,
        ]);
    }
}
