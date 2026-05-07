<?php

namespace App\Services\Customers;

use App\Models\CustomerNote;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use RuntimeException;

final class CustomerNoteService
{
    /**
     * @return Collection<int, CustomerNote>
     */
    public function listFor(User $customer): Collection
    {
        $this->assertCustomer($customer);

        return CustomerNote::query()
            ->where('customer_user_id', $customer->id)
            ->with('author')
            ->orderByDesc('pinned')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  array{body: string, pinned?: bool}  $data
     */
    public function create(User $customer, User $author, array $data): CustomerNote
    {
        $this->assertCustomer($customer);

        $note = CustomerNote::query()->create([
            'customer_user_id' => $customer->id,
            'author_user_id' => $author->id,
            'body' => $data['body'],
            'pinned' => (bool) ($data['pinned'] ?? false),
        ]);

        return $note->fresh(['author']) ?? $note;
    }

    /**
     * @param  array{body?: string, pinned?: bool}  $data
     */
    public function update(CustomerNote $note, array $data): CustomerNote
    {
        $note->update(array_intersect_key($data, array_flip(['body', 'pinned'])));

        return $note->fresh(['author']) ?? $note;
    }

    public function delete(CustomerNote $note): void
    {
        $note->delete();
    }

    private function assertCustomer(User $user): void
    {
        $user->loadMissing('role');
        if (! $user->hasRole(Role::SLUG_CUSTOMER)) {
            throw new RuntimeException('Notes are only kept for customer accounts.');
        }
    }
}
