<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_rebook_nudges', function (Blueprint $table): void {
            $table->id();
            // The completed appointment that drives the suggestion. One row
            // per source appointment guarantees we only ever nudge the
            // customer once per past visit (modulo snooze re-arming).
            $table->foreignId('source_appointment_id')
                ->constrained('appointments')
                ->cascadeOnDelete();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            // 'sent' once dispatched; 'snoozed' if the customer chose to
            // defer. Snooze with snooze_until <= now becomes eligible again.
            $table->string('state', 16)->default('sent');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('snooze_until')->nullable();
            $table->timestamps();

            $table->unique('source_appointment_id');
            $table->index(['user_id', 'state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_rebook_nudges');
    }
};
