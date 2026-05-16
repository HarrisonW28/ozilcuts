<?php

namespace App\Services\Customers;

use App\Models\Appointment;
use App\Models\CustomerProfile;
use App\Models\HairProfile;
use App\Models\HairProfilePhoto;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/**
 * Anonymize a customer account and remove personal data while keeping
 * anonymized visit history for shop operations.
 */
final class CustomerAccountDeletionService
{
    public function perform(User $user): void
    {
        $user->loadMissing(['hairProfile.photos', 'customerProfile']);

        Appointment::query()
            ->where('customer_user_id', $user->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('starts_at', '>', CarbonImmutable::now())
            ->update(['status' => Appointment::STATUS_CANCELLED]);

        $hair = $user->hairProfile;
        if ($hair !== null) {
            foreach ($hair->photos as $photo) {
                if ($photo->path !== null && $photo->path !== '') {
                    Storage::disk('local')->delete($photo->path);
                }
                $photo->delete();
            }
            $hair->delete();
        }

        CustomerProfile::query()->where('user_id', $user->id)->delete();

        $user->tokens()->delete();

        $anonEmail = 'deleted-'.$user->id.'@deleted.ozilcuts.local';

        $user->forceFill([
            'name' => 'Deleted account',
            'email' => $anonEmail,
            'password' => Hash::make(bin2hex(random_bytes(32))),
            'remember_token' => null,
            'provider' => null,
            'provider_id' => null,
            'terms_accepted_at' => null,
            'privacy_policy_accepted_at' => null,
        ])->save();
    }
}
