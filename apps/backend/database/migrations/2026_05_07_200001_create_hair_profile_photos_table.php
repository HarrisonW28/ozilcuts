<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hair_profile_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hair_profile_id')->constrained()->cascadeOnDelete();
            $table->string('disk', 32);
            $table->string('path', 255);
            $table->string('original_name', 255);
            $table->string('mime_type', 64);
            $table->unsignedInteger('size_bytes');
            $table->string('caption', 140)->nullable();
            $table->timestamps();
            $table->index('hair_profile_id', 'hair_profile_photos_profile_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hair_profile_photos');
    }
};
