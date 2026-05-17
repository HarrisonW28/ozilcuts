<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('shop_hero_video_mobile_path')->nullable()->after('shop_hero_video_path');
            $table->string('shop_hero_poster_mobile_path')->nullable()->after('shop_hero_poster_path');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'shop_hero_video_mobile_path',
                'shop_hero_poster_mobile_path',
            ]);
        });
    }
};
