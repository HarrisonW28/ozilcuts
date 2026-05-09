<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_reminders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('appointment_id')
                ->constrained('appointments')
                ->cascadeOnDelete();
            // 'day_before' | 'hour_before' for scheduled reminders.
            // Manual reminders are dispatched out-of-band and are not
            // recorded here so admins can re-send freely.
            $table->string('kind', 32);
            $table->timestamp('sent_at');
            $table->timestamps();

            // Idempotency: each scheduled reminder kind is sent at most
            // once per appointment.
            $table->unique(['appointment_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_reminders');
    }
};
