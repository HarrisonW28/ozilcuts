<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BarberProfile;
use App\Models\HairProfile;
use App\Models\HairProfilePhoto;
use App\Models\Service;
use App\Models\User;
use App\Services\Customers\HairProfileService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Testing\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HairProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_hair_profile_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/customer/hair-profile')->assertUnauthorized();
        $this->patchJson('/api/v1/customer/hair-profile', [])->assertUnauthorized();
        $this->postJson('/api/v1/customer/hair-profile/photos', [])->assertUnauthorized();
    }

    public function test_customer_profile_is_created_on_first_read(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/hair-profile')
            ->assertOk()
            ->assertJsonPath('hair_type', null)
            ->assertJsonPath('hair_thickness', null)
            ->assertJsonPath('user.id', $customer->id)
            ->assertJsonPath('photos', []);

        $this->assertDatabaseHas('hair_profiles', [
            'user_id' => $customer->id,
        ]);
    }

    public function test_non_customer_cannot_access_hair_profile(): void
    {
        $barber = User::factory()->barber()->create();

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/customer/hair-profile')
            ->assertForbidden();

        $this->actingAs($barber, 'sanctum')
            ->patchJson('/api/v1/customer/hair-profile', [
                'hair_type' => 'wavy',
            ])
            ->assertForbidden();
    }

    public function test_customer_can_update_structured_fields(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/customer/hair-profile', [
                'hair_type' => 'curly',
                'hair_thickness' => 'medium',
                'hair_length' => 'short',
                'scalp_condition' => 'sensitive',
                'preferred_clipper_guard' => '#3',
                'allergies' => 'Tea tree oil',
                'styling_notes' => 'Skin fade with textured top.',
            ])
            ->assertOk()
            ->assertJsonPath('hair_type', 'curly')
            ->assertJsonPath('preferred_clipper_guard', '#3')
            ->assertJsonPath('allergies', 'Tea tree oil');

        $this->assertDatabaseHas('hair_profiles', [
            'user_id' => $customer->id,
            'hair_type' => 'curly',
            'hair_thickness' => 'medium',
            'hair_length' => 'short',
            'scalp_condition' => 'sensitive',
        ]);
    }

    public function test_invalid_enum_values_are_rejected(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/customer/hair-profile', [
                'hair_type' => 'frizzy',
                'scalp_condition' => 'unknown',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['hair_type', 'scalp_condition']);
    }

    public function test_partial_update_preserves_existing_fields(): void
    {
        $customer = User::factory()->create();
        HairProfile::factory()->create([
            'user_id' => $customer->id,
            'hair_type' => 'wavy',
            'styling_notes' => 'Keep it long on top.',
        ]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/customer/hair-profile', [
                'allergies' => 'None known',
            ])
            ->assertOk()
            ->assertJsonPath('hair_type', 'wavy')
            ->assertJsonPath('styling_notes', 'Keep it long on top.')
            ->assertJsonPath('allergies', 'None known');
    }

    public function test_customer_can_upload_a_photo(): void
    {
        Storage::fake('local');
        $customer = User::factory()->create();
        $file = UploadedFile::fake()->image('hair.jpg', 800, 800);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/customer/hair-profile/photos', [
                'photo' => $file,
                'caption' => 'Last cut',
            ])
            ->assertCreated()
            ->assertJsonStructure(['id', 'caption', 'mime_type', 'size_bytes', 'url']);

        $photoId = (int) $response->json('id');
        $photo = HairProfilePhoto::query()->findOrFail($photoId);
        Storage::disk('local')->assertExists($photo->path);
        $this->assertSame('Last cut', $photo->caption);
    }

    public function test_non_image_uploads_are_rejected(): void
    {
        Storage::fake('local');
        $customer = User::factory()->create();
        $file = File::create('notes.txt', 10);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/customer/hair-profile/photos', [
                'photo' => $file,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['photo']);
    }

    public function test_photo_upload_limit_is_enforced(): void
    {
        Storage::fake('local');
        $customer = User::factory()->create();
        $profile = HairProfile::factory()->create(['user_id' => $customer->id]);
        for ($i = 0; $i < HairProfileService::PHOTO_MAX_PER_PROFILE; $i++) {
            HairProfilePhoto::query()->create([
                'hair_profile_id' => $profile->id,
                'disk' => 'local',
                'path' => "hair-profiles/{$customer->id}/existing-{$i}.jpg",
                'original_name' => "existing-{$i}.jpg",
                'mime_type' => 'image/jpeg',
                'size_bytes' => 100,
                'caption' => null,
            ]);
        }

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/customer/hair-profile/photos', [
                'photo' => UploadedFile::fake()->image('extra.jpg'),
            ])
            ->assertUnprocessable();
    }

    public function test_customer_can_delete_their_own_photo(): void
    {
        Storage::fake('local');
        $customer = User::factory()->create();
        $profile = HairProfile::factory()->create(['user_id' => $customer->id]);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/customer/hair-profile/photos', [
                'photo' => UploadedFile::fake()->image('snap.png'),
            ])
            ->assertCreated();

        $photo = $profile->photos()->latest('id')->firstOrFail();
        Storage::disk('local')->assertExists($photo->path);

        $this->actingAs($customer, 'sanctum')
            ->deleteJson('/api/v1/customer/hair-profile/photos/'.$photo->id)
            ->assertOk()
            ->assertJsonPath('deleted', true);

        Storage::disk('local')->assertMissing($photo->path);
        $this->assertDatabaseMissing('hair_profile_photos', ['id' => $photo->id]);
    }

    public function test_customer_cannot_delete_someone_elses_photo(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $profile = HairProfile::factory()->create(['user_id' => $owner->id]);
        $photo = HairProfilePhoto::query()->create([
            'hair_profile_id' => $profile->id,
            'disk' => 'local',
            'path' => "hair-profiles/{$owner->id}/keep.jpg",
            'original_name' => 'keep.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => 100,
            'caption' => null,
        ]);

        $this->actingAs($intruder, 'sanctum')
            ->deleteJson('/api/v1/customer/hair-profile/photos/'.$photo->id)
            ->assertForbidden();

        $this->assertDatabaseHas('hair_profile_photos', ['id' => $photo->id]);
    }

    public function test_signed_photo_url_serves_file_and_rejects_unsigned_requests(): void
    {
        Storage::fake('local');
        $customer = User::factory()->create();

        $resp = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/customer/hair-profile/photos', [
                'photo' => UploadedFile::fake()->image('snap.jpg', 200, 200),
            ])
            ->assertCreated();

        $signedUrl = (string) $resp->json('url');
        $this->assertNotSame('', $signedUrl);

        // Hitting the path without a signature is forbidden.
        $unsigned = '/api/v1/hair-profile-photos/'.$resp->json('id');
        $this->getJson($unsigned)->assertForbidden();

        // Following the signed URL should succeed and return the bytes.
        $relative = parse_url($signedUrl, PHP_URL_PATH).'?'.parse_url($signedUrl, PHP_URL_QUERY);
        $this->get($relative)->assertOk();
    }

    public function test_assigned_barber_can_view_customer_hair_profile_via_appointment(): void
    {
        Storage::fake('local');
        $customer = User::factory()->create();
        HairProfile::factory()->create([
            'user_id' => $customer->id,
            'hair_type' => 'coily',
            'styling_notes' => 'Low taper.',
        ]);

        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $barber->id]);
        $service = Service::factory()->create(['duration_minutes' => 30]);
        $start = CarbonImmutable::now()->addDay()->setTime(9, 0);
        $appointment = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => $start,
            'ends_at' => $start->addMinutes(30),
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/appointments/'.$appointment->id.'/hair-profile')
            ->assertOk()
            ->assertJsonPath('data.hair_type', 'coily')
            ->assertJsonPath('data.styling_notes', 'Low taper.');
    }

    public function test_unrelated_barber_cannot_view_customer_hair_profile_via_appointment(): void
    {
        $customer = User::factory()->create();
        HairProfile::factory()->create(['user_id' => $customer->id]);

        $assignedBarber = User::factory()->barber()->create();
        $otherBarber = User::factory()->barber()->create();
        $service = Service::factory()->create(['duration_minutes' => 30]);
        $start = CarbonImmutable::now()->addDay()->setTime(9, 0);
        $appointment = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $assignedBarber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => $start,
            'ends_at' => $start->addMinutes(30),
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($otherBarber, 'sanctum')
            ->getJson('/api/v1/appointments/'.$appointment->id.'/hair-profile')
            ->assertForbidden();
    }

    public function test_appointment_hair_profile_returns_null_when_customer_has_no_profile(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create(['duration_minutes' => 30]);
        $start = CarbonImmutable::now()->addDay()->setTime(9, 0);
        $appointment = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => $start,
            'ends_at' => $start->addMinutes(30),
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/appointments/'.$appointment->id.'/hair-profile')
            ->assertOk()
            ->assertExactJson(['data' => null]);
    }

    public function test_admin_can_view_any_appointment_hair_profile(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();
        HairProfile::factory()->create([
            'user_id' => $customer->id,
            'hair_type' => 'wavy',
        ]);
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create(['duration_minutes' => 30]);
        $start = CarbonImmutable::now()->addDay()->setTime(9, 0);
        $appointment = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => $start,
            'ends_at' => $start->addMinutes(30),
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/appointments/'.$appointment->id.'/hair-profile')
            ->assertOk()
            ->assertJsonPath('data.hair_type', 'wavy');
    }
}
