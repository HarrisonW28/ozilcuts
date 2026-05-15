<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('kind', 24);
            $table->string('operational_key', 48)->nullable();
            $table->text('body');
            $table->timestamps();

            $table->index(['appointment_id', 'id']);
        });

        Schema::create('appointment_message_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('last_read_message_id')->nullable();
            $table->timestamps();

            $table->unique(['appointment_id', 'user_id']);
            $table->index(['user_id', 'appointment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_message_reads');
        Schema::dropIfExists('appointment_messages');
    }
};
