<?php

namespace App\Services\Customers;

use App\Models\CustomerTag;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use RuntimeException;

final class CustomerTagService
{
    /**
     * @return Collection<int, CustomerTag>
     */
    public function listFor(User $customer): Collection
    {
        $this->assertCustomer($customer);

        return CustomerTag::query()
            ->where('customer_user_id', $customer->id)
            ->orderBy('label')
            ->get();
    }

    public function attach(User $customer, User $createdBy, string $rawLabel): CustomerTag
    {
        $this->assertCustomer($customer);

        $label = CustomerTag::normalizeLabel($rawLabel);
        if ($label === '') {
            throw new RuntimeException('Tag label cannot be empty.');
        }

        return CustomerTag::query()->firstOrCreate(
            [
                'customer_user_id' => $customer->id,
                'label' => $label,
            ],
            [
                'created_by_user_id' => $createdBy->id,
            ],
        );
    }

    public function detach(CustomerTag $tag): void
    {
        $tag->delete();
    }

    public function isVip(User $customer): bool
    {
        $this->assertCustomer($customer);

        return CustomerTag::query()
            ->where('customer_user_id', $customer->id)
            ->where('label', CustomerTag::LABEL_VIP)
            ->exists();
    }

    public function setVip(User $customer, User $createdBy, bool $vip): void
    {
        $this->assertCustomer($customer);

        $existing = CustomerTag::query()
            ->where('customer_user_id', $customer->id)
            ->where('label', CustomerTag::LABEL_VIP)
            ->first();

        if ($vip) {
            if ($existing === null) {
                $this->attach($customer, $createdBy, CustomerTag::LABEL_VIP);
            }

            return;
        }

        if ($existing !== null) {
            $existing->delete();
        }
    }

    /**
     * Suggest existing labels (case-insensitive de-dupe) for autocomplete.
     *
     * @return list<string>
     */
    public function suggestions(?string $query, int $limit = 12): array
    {
        $builder = CustomerTag::query()->select('label')->distinct();
        if ($query !== null && trim($query) !== '') {
            $needle = CustomerTag::normalizeLabel($query);
            if ($needle !== '') {
                $builder->where('label', 'like', $needle.'%');
            }
        }

        return $builder
            ->orderBy('label')
            ->limit(max(1, min(50, $limit)))
            ->pluck('label')
            ->all();
    }

    private function assertCustomer(User $user): void
    {
        $user->loadMissing('role');
        if (! $user->hasRole(Role::SLUG_CUSTOMER)) {
            throw new RuntimeException('Tags are only kept for customer accounts.');
        }
    }
}
