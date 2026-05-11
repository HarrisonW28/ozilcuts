<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\PatchShopOnboardingRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

final class ShopOnboardingUpdateController extends Controller
{
    public function __invoke(PatchShopOnboardingRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $payload = $request->validated();

        if (! empty($payload['complete'])) {
            $user->onboarding_completed_at = now();
            $user->onboarding_step = 6;
        }

        if (array_key_exists('shop_display_name', $payload)) {
            $name = $payload['shop_display_name'];
            $user->shop_display_name = $name === '' ? null : $name;
        }

        if (array_key_exists('onboarding_step', $payload) && empty($payload['complete'])) {
            $user->onboarding_step = $payload['onboarding_step'];
        }

        if (array_key_exists('shop_pays_cash_only', $payload)) {
            $user->shop_pays_cash_only = $payload['shop_pays_cash_only'];
        }

        if (array_key_exists('shop_deposits_enabled', $payload)) {
            $user->shop_deposits_enabled = $payload['shop_deposits_enabled'];
        }

        if (array_key_exists('shop_tap_to_pay_later', $payload)) {
            $user->shop_tap_to_pay_later = $payload['shop_tap_to_pay_later'];
        }

        if (array_key_exists('shop_default_hours', $payload)) {
            $user->shop_default_hours = $payload['shop_default_hours'];
        }

        $user->save();
        $user->load('role');

        return response()->json((new UserResource($user))->toArray($request));
    }
}
