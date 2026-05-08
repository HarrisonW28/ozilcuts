<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_preferences', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // Event key, mirrors notifications.type. Constrained in code by
            // the NotificationEvents allow-list.
            $table->string('event_key', 64);
            // 'mail' or 'inapp' — constrained by the NotificationChannels
            // allow-list in code.
            $table->string('channel', 32);
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'event_key', 'channel']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
