<?php

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('shop_display_name')->nullable()->after('email');
            $table->unsignedTinyInteger('onboarding_step')->default(1);
            $table->timestamp('onboarding_completed_at')->nullable();
            $table->boolean('shop_pays_cash_only')->default(true);
            $table->boolean('shop_deposits_enabled')->default(true);
            $table->boolean('shop_tap_to_pay_later')->default(true);
        });

        $adminRoleId = Role::query()->where('slug', Role::SLUG_ADMIN)->value('id');
        if ($adminRoleId !== null) {
            DB::table('users')->where('role_id', $adminRoleId)->update([
                'onboarding_completed_at' => now(),
                'onboarding_step' => 6,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'shop_display_name',
                'onboarding_step',
                'onboarding_completed_at',
                'shop_pays_cash_only',
                'shop_deposits_enabled',
                'shop_tap_to_pay_later',
            ]);
        });
    }
};
