<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BarberProfile;
use App\Models\HaircutPhoto;
use App\Models\Service;
use App\Models\User;
use App\Services\HaircutPhotos\HaircutPhotoService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Testing\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HaircutPhotoTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: User, 1: User, 2: Appointment}
     */
    private function makeAppointment(): array
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
        ]);
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

        return [$customer, $barber, $appointment];
    }

    public function test_haircut_photo_endpoints_require_authentication(): void
    {
        [, , $appointment] = $this->makeAppointment();

        $this->getJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos')
            ->assertUnauthorized();
        $this->postJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos', [])
            ->assertUnauthorized();
    }

    public function test_unrelated_user_cannot_view_appointment_photos(): void
    {
        [, , $appointment] = $this->makeAppointment();
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->getJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos')
            ->assertForbidden();
    }

    public function test_customer_cannot_upload_haircut_photos(): void
    {
        Storage::fake('local');
        [$customer, , $appointment] = $this->makeAppointment();

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos', [
                'photo' => UploadedFile::fake()->image('cut.jpg'),
                'kind' => 'after',
            ])
            ->assertForbidden();
    }

    public function test_assigned_barber_can_upload_a_photo(): void
    {
        Storage::fake('local');
        [, $barber, $appointment] = $this->makeAppointment();

        $response = $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos', [
                'photo' => UploadedFile::fake()->image('after.jpg', 800, 800),
                'kind' => 'after',
                'caption' => 'Skin fade complete',
            ])
            ->assertCreated()
            ->assertJsonPath('kind', 'after')
            ->assertJsonPath('caption', 'Skin fade complete')
            ->assertJsonPath('is_public', false)
            ->assertJsonPath('customer_consent', false)
            ->assertJsonStructure(['id', 'url']);

        $photoId = (int) $response->json('id');
        $photo = HaircutPhoto::query()->findOrFail($photoId);
        Storage::disk('local')->assertExists($photo->path);
        $this->assertSame($barber->id, $photo->uploaded_by_user_id);
    }

    public function test_unrelated_barber_cannot_upload_to_someone_elses_appointment(): void
    {
        Storage::fake('local');
        [, , $appointment] = $this->makeAppointment();
        $otherBarber = User::factory()->barber()->create();

        $this->actingAs($otherBarber, 'sanctum')
            ->postJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos', [
                'photo' => UploadedFile::fake()->image('cut.jpg'),
                'kind' => 'after',
            ])
            ->assertForbidden();
    }

    public function test_invalid_kind_is_rejected(): void
    {
        Storage::fake('local');
        [, $barber, $appointment] = $this->makeAppointment();

        $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos', [
                'photo' => UploadedFile::fake()->image('cut.jpg'),
                'kind' => 'sideways',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['kind']);
    }

    public function test_non_image_uploads_are_rejected(): void
    {
        Storage::fake('local');
        [, $barber, $appointment] = $this->makeAppointment();

        $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos', [
                'photo' => File::create('notes.txt', 10),
                'kind' => 'after',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['photo']);
    }

    public function test_photo_cap_is_enforced_per_appointment(): void
    {
        Storage::fake('local');
        [, $barber, $appointment] = $this->makeAppointment();

        for ($i = 0; $i < HaircutPhotoService::PHOTO_MAX_PER_APPOINTMENT; $i++) {
            HaircutPhoto::factory()->create([
                'appointment_id' => $appointment->id,
                'uploaded_by_user_id' => $barber->id,
            ]);
        }

        $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos', [
                'photo' => UploadedFile::fake()->image('extra.jpg'),
                'kind' => 'after',
            ])
            ->assertUnprocessable();
    }

    public function test_customer_and_barber_can_list_appointment_photos(): void
    {
        Storage::fake('local');
        [$customer, $barber, $appointment] = $this->makeAppointment();
        HaircutPhoto::factory()->count(2)->create([
            'appointment_id' => $appointment->id,
            'uploaded_by_user_id' => $barber->id,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_customer_cannot_use_staff_only_fields(): void
    {
        [$customer, $barber, $appointment] = $this->makeAppointment();
        $photo = HaircutPhoto::factory()->create([
            'appointment_id' => $appointment->id,
            'uploaded_by_user_id' => $barber->id,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/haircut-photos/'.$photo->id, [
                'caption' => 'Customer override',
            ])
            ->assertForbidden();

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/haircut-photos/'.$photo->id, [
                'is_public' => true,
            ])
            ->assertForbidden();
    }

    public function test_barber_cannot_set_public_without_customer_consent(): void
    {
        [, $barber, $appointment] = $this->makeAppointment();
        $photo = HaircutPhoto::factory()->create([
            'appointment_id' => $appointment->id,
            'uploaded_by_user_id' => $barber->id,
            'customer_consent' => false,
        ]);

        $this->actingAs($barber, 'sanctum')
            ->patchJson('/api/v1/haircut-photos/'.$photo->id, [
                'is_public' => true,
            ])
            ->assertOk()
            ->assertJsonPath('is_public', false);

        $this->assertDatabaseHas('haircut_photos', [
            'id' => $photo->id,
            'is_public' => false,
        ]);
    }

    public function test_consent_then_publish_flow(): void
    {
        [$customer, $barber, $appointment] = $this->makeAppointment();
        $photo = HaircutPhoto::factory()->create([
            'appointment_id' => $appointment->id,
            'uploaded_by_user_id' => $barber->id,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/haircut-photos/'.$photo->id, [
                'customer_consent' => true,
            ])
            ->assertOk()
            ->assertJsonPath('customer_consent', true);

        $this->actingAs($barber, 'sanctum')
            ->patchJson('/api/v1/haircut-photos/'.$photo->id, [
                'is_public' => true,
                'caption' => 'Showcase cut',
            ])
            ->assertOk()
            ->assertJsonPath('is_public', true)
            ->assertJsonPath('caption', 'Showcase cut');
    }

    public function test_revoking_consent_unpublishes_a_photo(): void
    {
        [$customer, $barber, $appointment] = $this->makeAppointment();
        $photo = HaircutPhoto::factory()->publishedWithConsent()->create([
            'appointment_id' => $appointment->id,
            'uploaded_by_user_id' => $barber->id,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/haircut-photos/'.$photo->id, [
                'customer_consent' => false,
            ])
            ->assertOk()
            ->assertJsonPath('customer_consent', false)
            ->assertJsonPath('is_public', false);
    }

    public function test_only_uploader_assigned_barber_or_admin_can_delete(): void
    {
        Storage::fake('local');
        [$customer, $barber, $appointment] = $this->makeAppointment();
        $photo = HaircutPhoto::factory()->create([
            'appointment_id' => $appointment->id,
            'uploaded_by_user_id' => $barber->id,
            'disk' => 'local',
            'path' => 'haircut-photos/'.$appointment->id.'/sample.jpg',
        ]);
        Storage::disk('local')->put($photo->path, 'fake');

        $this->actingAs($customer, 'sanctum')
            ->deleteJson('/api/v1/haircut-photos/'.$photo->id)
            ->assertForbidden();

        $this->actingAs($barber, 'sanctum')
            ->deleteJson('/api/v1/haircut-photos/'.$photo->id)
            ->assertOk();

        Storage::disk('local')->assertMissing($photo->path);
        $this->assertDatabaseMissing('haircut_photos', ['id' => $photo->id]);
    }

    public function test_signed_photo_url_serves_file_and_rejects_unsigned(): void
    {
        Storage::fake('local');
        [, $barber, $appointment] = $this->makeAppointment();

        $resp = $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/appointments/'.$appointment->id.'/haircut-photos', [
                'photo' => UploadedFile::fake()->image('cut.jpg', 200, 200),
                'kind' => 'after',
            ])
            ->assertCreated();

        $signedUrl = (string) $resp->json('url');
        $unsigned = '/api/v1/haircut-photos/'.$resp->json('id');
        $this->getJson($unsigned)->assertForbidden();

        $relative = parse_url($signedUrl, PHP_URL_PATH).'?'.parse_url($signedUrl, PHP_URL_QUERY);
        $this->get($relative)->assertOk();
    }

    public function test_public_portfolio_returns_only_consented_public_photos_for_published_barber(): void
    {
        [, $barber, $appointment] = $this->makeAppointment();
        HaircutPhoto::factory()->publishedWithConsent()->count(2)->create([
            'appointment_id' => $appointment->id,
            'uploaded_by_user_id' => $barber->id,
        ]);
        HaircutPhoto::factory()->create([
            'appointment_id' => $appointment->id,
            'uploaded_by_user_id' => $barber->id,
            'is_public' => true,
            'customer_consent' => false,
        ]);
        HaircutPhoto::factory()->create([
            'appointment_id' => $appointment->id,
            'uploaded_by_user_id' => $barber->id,
            'is_public' => false,
            'customer_consent' => true,
        ]);

        $this->getJson('/api/v1/barbers/'.$barber->id.'/portfolio')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 2);
    }

    public function test_portfolio_returns_404_for_unpublished_or_non_barber(): void
    {
        $unpublishedBarber = User::factory()->barber()->create();
        BarberProfile::factory()->create([
            'user_id' => $unpublishedBarber->id,
            'is_published' => false,
        ]);

        $this->getJson('/api/v1/barbers/'.$unpublishedBarber->id.'/portfolio')
            ->assertNotFound();

        $customer = User::factory()->create();
        $this->getJson('/api/v1/barbers/'.$customer->id.'/portfolio')
            ->assertNotFound();
    }

    public function test_portfolio_does_not_leak_other_barbers_photos(): void
    {
        [, $barberA, $appointmentA] = $this->makeAppointment();
        [, $barberB, $appointmentB] = $this->makeAppointment();

        HaircutPhoto::factory()->publishedWithConsent()->create([
            'appointment_id' => $appointmentA->id,
            'uploaded_by_user_id' => $barberA->id,
        ]);
        HaircutPhoto::factory()->publishedWithConsent()->create([
            'appointment_id' => $appointmentB->id,
            'uploaded_by_user_id' => $barberB->id,
        ]);

        $this->getJson('/api/v1/barbers/'.$barberA->id.'/portfolio')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1);
    }
}
