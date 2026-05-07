<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            /** @var int Required deposit at booking, in cents. 0 disables deposit. */
            $table->unsignedInteger('deposit_cents')->default(0)->after('price_cents');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('deposit_cents');
        });
    }
};
