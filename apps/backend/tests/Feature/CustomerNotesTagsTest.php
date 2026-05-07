<?php

namespace Tests\Feature;

use App\Models\CustomerNote;
use App\Models\CustomerTag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerNotesTagsTest extends TestCase
{
    use RefreshDatabase;

    public function test_endpoints_require_authentication(): void
    {
        $customer = User::factory()->create();

        $this->getJson('/api/v1/customers/'.$customer->id.'/notes')->assertUnauthorized();
        $this->postJson('/api/v1/customers/'.$customer->id.'/notes', [])->assertUnauthorized();
        $this->getJson('/api/v1/customers/'.$customer->id.'/tags')->assertUnauthorized();
        $this->postJson('/api/v1/customers/'.$customer->id.'/tags', [])->assertUnauthorized();
        $this->getJson('/api/v1/customer-tags/suggestions')->assertUnauthorized();
    }

    public function test_customer_cannot_see_their_own_notes_or_tags(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customers/'.$customer->id.'/notes')
            ->assertForbidden();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customers/'.$customer->id.'/tags')
            ->assertForbidden();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer-tags/suggestions')
            ->assertForbidden();
    }

    public function test_barber_can_create_list_update_and_delete_their_note(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();

        $created = $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/customers/'.$customer->id.'/notes', [
                'body' => 'Prefers a cool drink during long appointments.',
                'pinned' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('body', 'Prefers a cool drink during long appointments.')
            ->assertJsonPath('pinned', true)
            ->assertJsonPath('author_user_id', $barber->id)
            ->json();

        $noteId = (int) $created['id'];

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/customers/'.$customer->id.'/notes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $noteId);

        $this->actingAs($barber, 'sanctum')
            ->patchJson('/api/v1/customer-notes/'.$noteId, [
                'body' => 'Updated body.',
                'pinned' => false,
            ])
            ->assertOk()
            ->assertJsonPath('body', 'Updated body.')
            ->assertJsonPath('pinned', false);

        $this->actingAs($barber, 'sanctum')
            ->deleteJson('/api/v1/customer-notes/'.$noteId)
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseMissing('customer_notes', ['id' => $noteId]);
    }

    public function test_barber_cannot_modify_another_barbers_note(): void
    {
        $customer = User::factory()->create();
        $owner = User::factory()->barber()->create();
        $intruder = User::factory()->barber()->create();
        $note = CustomerNote::factory()->create([
            'customer_user_id' => $customer->id,
            'author_user_id' => $owner->id,
        ]);

        $this->actingAs($intruder, 'sanctum')
            ->patchJson('/api/v1/customer-notes/'.$note->id, ['body' => 'Mine now'])
            ->assertForbidden();

        $this->actingAs($intruder, 'sanctum')
            ->deleteJson('/api/v1/customer-notes/'.$note->id)
            ->assertForbidden();

        $this->assertDatabaseHas('customer_notes', [
            'id' => $note->id,
            'body' => $note->body,
        ]);
    }

    public function test_admin_can_modify_any_note(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();
        $admin = User::factory()->admin()->create();
        $note = CustomerNote::factory()->create([
            'customer_user_id' => $customer->id,
            'author_user_id' => $barber->id,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/v1/customer-notes/'.$note->id, [
                'body' => 'Edited by admin',
            ])
            ->assertOk()
            ->assertJsonPath('body', 'Edited by admin');

        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/v1/customer-notes/'.$note->id)
            ->assertOk();
    }

    public function test_notes_must_target_customer_accounts(): void
    {
        $barber = User::factory()->barber()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/customers/'.$barber->id.'/notes', [
                'body' => 'Should fail',
            ])
            ->assertStatus(422);
    }

    public function test_note_validation(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();

        $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/customers/'.$customer->id.'/notes', [
                'body' => '',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }

    public function test_pinned_notes_appear_first(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();
        CustomerNote::factory()->create([
            'customer_user_id' => $customer->id,
            'author_user_id' => $barber->id,
            'body' => 'Older unpinned',
            'pinned' => false,
        ]);
        $pinned = CustomerNote::factory()->pinned()->create([
            'customer_user_id' => $customer->id,
            'author_user_id' => $barber->id,
            'body' => 'Pinned note',
        ]);

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/customers/'.$customer->id.'/notes')
            ->assertOk()
            ->assertJsonPath('data.0.id', $pinned->id);
    }

    public function test_tag_label_is_normalized_and_dedup_idempotent(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();

        $first = $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/customers/'.$customer->id.'/tags', [
                'label' => '  VIP  ',
            ])
            ->assertCreated()
            ->assertJsonPath('label', 'vip')
            ->json();

        $second = $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/customers/'.$customer->id.'/tags', [
                'label' => 'vip',
            ])
            ->assertOk()
            ->json();

        $this->assertSame($first['id'], $second['id']);
        $this->assertDatabaseCount('customer_tags', 1);
    }

    public function test_blank_tag_label_is_rejected(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();

        $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/customers/'.$customer->id.'/tags', [
                'label' => '   ',
            ])
            ->assertStatus(422);
    }

    public function test_listing_and_removing_a_tag(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();
        $tag = CustomerTag::factory()->create([
            'customer_user_id' => $customer->id,
            'created_by_user_id' => $barber->id,
            'label' => 'vip',
        ]);

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/customers/'.$customer->id.'/tags')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.label', 'vip');

        $this->actingAs($barber, 'sanctum')
            ->deleteJson('/api/v1/customer-tags/'.$tag->id)
            ->assertOk();

        $this->assertDatabaseMissing('customer_tags', ['id' => $tag->id]);
    }

    public function test_tag_suggestions_match_prefix_case_insensitive(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();
        CustomerTag::factory()->create([
            'customer_user_id' => $customer->id,
            'created_by_user_id' => $barber->id,
            'label' => 'sensitive scalp',
        ]);
        CustomerTag::factory()->create([
            'customer_user_id' => $customer->id,
            'created_by_user_id' => $barber->id,
            'label' => 'showcase',
        ]);
        CustomerTag::factory()->create([
            'customer_user_id' => $customer->id,
            'created_by_user_id' => $barber->id,
            'label' => 'vip',
        ]);

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/customer-tags/suggestions?q=S')
            ->assertOk()
            ->assertExactJson([
                'data' => ['sensitive scalp', 'showcase'],
            ]);
    }
}
