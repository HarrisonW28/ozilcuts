<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class StaffCustomerSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $actor = $request->user();
        if ($actor === null) {
            abort(401);
        }

        if (! $actor->isAdmin() && ! $actor->hasRole(Role::SLUG_BARBER)) {
            abort(403);
        }

        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:120'],
        ]);

        $needle = trim((string) $validated['q']);
        $like = '%'.addcslashes(Str::lower($needle), '%_\\').'%';

        $customers = User::query()
            ->whereHas('role', fn ($q) => $q->where('slug', Role::SLUG_CUSTOMER))
            ->where(function ($q) use ($like): void {
                $q->whereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
            })
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'email']);

        return response()->json([
            'data' => $customers->map(fn (User $u): array => [
                'id' => (int) $u->id,
                'name' => (string) $u->name,
                'email' => (string) $u->email,
            ]),
        ]);
    }
}
