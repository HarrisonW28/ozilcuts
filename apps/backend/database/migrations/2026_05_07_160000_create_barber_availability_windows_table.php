<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barber_availability_windows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('barber_profile_id')->constrained()->cascadeOnDelete();
            /** @var int 0 = Sunday … 6 = Saturday (PHP date('w')) */
            $table->unsignedTinyInteger('weekday');
            $table->time('starts_at');
            $table->time('ends_at');
            $table->timestamps();

            $table->index(['barber_profile_id', 'weekday']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barber_availability_windows');
    }
};
