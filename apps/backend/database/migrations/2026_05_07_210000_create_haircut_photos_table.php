<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('haircut_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('kind', 16);
            $table->string('disk', 32);
            $table->string('path', 255);
            $table->string('original_name', 255);
            $table->string('mime_type', 64);
            $table->unsignedInteger('size_bytes');
            $table->string('caption', 140)->nullable();
            $table->boolean('is_public')->default(false);
            $table->boolean('customer_consent')->default(false);
            $table->timestamps();
            $table->index(['appointment_id', 'kind'], 'haircut_photos_appt_kind_idx');
            $table->index(['is_public', 'customer_consent'], 'haircut_photos_public_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('haircut_photos');
    }
};
