<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class UserIndexController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        return UserResource::collection(
            User::query()
                ->with('role')
                ->orderBy('id')
                ->paginate(15),
        );
    }
}
