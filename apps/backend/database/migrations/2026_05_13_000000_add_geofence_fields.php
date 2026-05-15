<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->decimal('shop_latitude', 10, 7)->nullable()->after('shop_default_hours');
            $table->decimal('shop_longitude', 10, 7)->nullable()->after('shop_latitude');
        });

        Schema::table('customer_profiles', function (Blueprint $table): void {
            $table->boolean('arrival_location_opt_in')->default(false)->after('retention_paused');
        });

        Schema::table('appointments', function (Blueprint $table): void {
            $table->timestamp('arrival_nearby_customer_notified_at')->nullable()->after('arrival_state');
            $table->timestamp('arrival_nearby_barber_notified_at')->nullable()->after('arrival_nearby_customer_notified_at');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table): void {
            $table->dropColumn([
                'arrival_nearby_customer_notified_at',
                'arrival_nearby_barber_notified_at',
            ]);
        });

        Schema::table('customer_profiles', function (Blueprint $table): void {
            $table->dropColumn('arrival_location_opt_in');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['shop_latitude', 'shop_longitude']);
        });
    }
};
