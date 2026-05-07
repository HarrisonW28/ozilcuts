<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Laravel\Sanctum\PersonalAccessToken;

final class LogoutController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $plain = $request->bearerToken();
        if ($plain !== null) {
            $accessToken = PersonalAccessToken::findToken($plain);
            if ($accessToken !== null && $accessToken->tokenable()->is($request->user())) {
                $accessToken->delete();
            }
        }

        return response()->noContent();
    }
}
