<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table): void {
            // 'always' (default) collects the deposit on every booking that
            // requires one; 'first_time_customer' only collects it for a
            // customer's first ever booking.
            $table->string('deposit_policy', 32)->default('always')->after('deposit_cents');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table): void {
            $table->dropColumn('deposit_policy');
        });
    }
};
