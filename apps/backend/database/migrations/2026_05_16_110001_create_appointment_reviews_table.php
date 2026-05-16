<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('barber_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('customer_user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('body');
            $table->timestamp('verified_at')->nullable();
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index(['barber_user_id', 'is_published', 'verified_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_reviews');
    }
};
