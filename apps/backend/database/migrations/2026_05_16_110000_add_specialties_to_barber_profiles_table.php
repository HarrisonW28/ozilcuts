<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('barber_profiles', function (Blueprint $table) {
            $table->json('specialties')->nullable()->after('years_experience');
        });
    }

    public function down(): void
    {
        Schema::table('barber_profiles', function (Blueprint $table) {
            $table->dropColumn('specialties');
        });
    }
};
