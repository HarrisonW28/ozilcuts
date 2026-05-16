<?php

namespace App\Services\Customers;

use App\Models\Appointment;
use App\Models\CustomerProfile;
use App\Models\Role;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Auth\Access\AuthorizationException;

/**
 * Privacy controls, data export, and account deletion for customer accounts.
 */
final class CustomerPrivacyService
{
    public function __construct(
        private readonly CustomerProfileService $profiles,
        private readonly NotificationService $notifications,
        private readonly CustomerAccountDeletionService $deletion,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function snapshot(User $user): array
    {
        $this->assertCustomer($user);

        $profile = $this->profiles->findOrCreateFor($user);
        $prefRows = $this->notifications->preferences($user);

        $enabledCount = 0;
        foreach ($prefRows as $row) {
            if ($row['enabled']) {
                $enabledCount++;
            }
        }

        return [
            'consents' => [
                'terms_accepted_at' => $user->terms_accepted_at?->toIso8601String(),
                'privacy_policy_accepted_at' => $user->privacy_policy_accepted_at?->toIso8601String(),
                'marketing_opt_in' => (bool) $profile->marketing_opt_in,
                'arrival_location_opt_in' => (bool) $profile->arrival_location_opt_in,
                'retention_paused' => (bool) $profile->retention_paused,
            ],
            'notifications' => [
                'enabled_count' => $enabledCount,
                'total_count' => count($prefRows),
            ],
            'data_rights' => [
                'can_export' => true,
                'can_delete_account' => true,
            ],
        ];
    }

    /**
     * @param  array{marketing_opt_in?: bool, arrival_location_opt_in?: bool, retention_paused?: bool}  $data
     * @return array<string, mixed>
     */
    public function updateControls(User $user, array $data): array
    {
        $this->assertCustomer($user);

        $profile = $this->profiles->findOrCreateFor($user);
        $this->profiles->update($profile, array_intersect_key($data, array_flip([
            'marketing_opt_in',
            'arrival_location_opt_in',
            'retention_paused',
        ])));

        return $this->snapshot($user->fresh() ?? $user);
    }

    /**
     * @return array<string, mixed>
     */
    public function exportPortableData(User $user): array
    {
        $this->assertCustomer($user);

        $user->loadMissing(['role', 'customerProfile', 'hairProfile.photos']);
        $profile = $user->customerProfile;
        $hair = $user->hairProfile;

        $appointments = Appointment::query()
            ->where('customer_user_id', $user->id)
            ->with(['service', 'barber'])
            ->orderByDesc('starts_at')
            ->limit(500)
            ->get();

        $appointmentRows = [];
        foreach ($appointments as $appt) {
            $appointmentRows[] = [
                'id' => $appt->id,
                'status' => $appt->status,
                'starts_at' => $appt->starts_at?->toIso8601String(),
                'ends_at' => $appt->ends_at?->toIso8601String(),
                'service' => $appt->service?->name,
                'barber' => $appt->barber?->name,
                'notes' => $appt->notes,
                'arrival_state' => $appt->arrival_state,
            ];
        }

        return [
            'exported_at' => CarbonImmutable::now()->toIso8601String(),
            'format' => 'ozilcuts-portable-export-v1',
            'account' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role?->slug,
                'created_at' => $user->created_at?->toIso8601String(),
                'terms_accepted_at' => $user->terms_accepted_at?->toIso8601String(),
                'privacy_policy_accepted_at' => $user->privacy_policy_accepted_at?->toIso8601String(),
            ],
            'profile' => $profile === null ? null : [
                'phone' => $profile->phone,
                'date_of_birth' => $profile->date_of_birth?->format('Y-m-d'),
                'preferences' => $profile->preferences,
                'marketing_opt_in' => (bool) $profile->marketing_opt_in,
                'retention_paused' => (bool) $profile->retention_paused,
                'arrival_location_opt_in' => (bool) $profile->arrival_location_opt_in,
            ],
            'hair_profile' => $hair === null ? null : [
                'hair_type' => $hair->hair_type,
                'hair_thickness' => $hair->hair_thickness,
                'hair_length' => $hair->hair_length,
                'scalp_condition' => $hair->scalp_condition,
                'styling_notes' => $hair->styling_notes,
                'allergies' => $hair->allergies,
                'photo_count' => $hair->photos->count(),
            ],
            'appointments' => $appointmentRows,
            'notification_preferences' => $this->notifications->preferences($user),
        ];
    }

    public function deleteAccount(User $user, string $confirmation): void
    {
        $this->assertCustomer($user);

        if (trim($confirmation) !== 'DELETE') {
            throw new RuntimeException('Type DELETE to confirm account removal.');
        }

        DB::transaction(function () use ($user): void {
            $this->deletion->perform($user);
        });
    }

    public function recordRegistrationConsents(
        User $user,
        bool $marketingOptIn = false,
    ): void {
        $now = now();
        $user->forceFill([
            'terms_accepted_at' => $now,
            'privacy_policy_accepted_at' => $now,
        ])->save();

        if ($user->hasRole(Role::SLUG_CUSTOMER)) {
            $profile = $this->profiles->findOrCreateFor($user);
            $profile->update([
                'marketing_opt_in' => $marketingOptIn,
                'arrival_location_opt_in' => false,
            ]);
        }
    }

    public function recordOAuthConsents(User $user): void
    {
        if ($user->terms_accepted_at === null || $user->privacy_policy_accepted_at === null) {
            $this->recordRegistrationConsents($user, marketingOptIn: false);
        }
    }

    private function assertCustomer(User $user): void
    {
        $user->loadMissing('role');
        if (! $user->hasRole(Role::SLUG_CUSTOMER)) {
            throw new AuthorizationException('Privacy controls are only available for customer accounts.');
        }
    }
}
