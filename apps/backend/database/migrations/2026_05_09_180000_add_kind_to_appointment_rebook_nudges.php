<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a `kind` column so the appointment_rebook_nudges table can carry
 * both the smart-rebook nudge and the new inactivity nudge with shared
 * idempotency machinery. The unique constraint is widened to
 * (source_appointment_id, kind) so each kind can fire at most once per
 * source appointment.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointment_rebook_nudges', function (Blueprint $table): void {
            $table->dropUnique(['source_appointment_id']);
        });

        Schema::table('appointment_rebook_nudges', function (Blueprint $table): void {
            $table->string('kind', 24)->default('due')->after('user_id');
        });

        Schema::table('appointment_rebook_nudges', function (Blueprint $table): void {
            $table->unique(['source_appointment_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::table('appointment_rebook_nudges', function (Blueprint $table): void {
            $table->dropUnique(['source_appointment_id', 'kind']);
        });

        Schema::table('appointment_rebook_nudges', function (Blueprint $table): void {
            $table->dropColumn('kind');
        });

        Schema::table('appointment_rebook_nudges', function (Blueprint $table): void {
            $table->unique(['source_appointment_id']);
        });
    }
};
