<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hair_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('hair_type', 16)->nullable();
            $table->string('hair_thickness', 16)->nullable();
            $table->string('hair_length', 16)->nullable();
            $table->string('scalp_condition', 16)->nullable();
            $table->string('preferred_clipper_guard', 32)->nullable();
            $table->text('allergies')->nullable();
            $table->text('styling_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hair_profiles');
    }
};
