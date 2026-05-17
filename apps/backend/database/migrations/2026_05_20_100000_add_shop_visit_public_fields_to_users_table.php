<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('shop_public_address', 500)->nullable()->after('shop_longitude');
            $table->text('shop_visit_note')->nullable()->after('shop_public_address');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['shop_public_address', 'shop_visit_note']);
        });
    }
};
