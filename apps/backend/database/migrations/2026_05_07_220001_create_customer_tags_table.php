<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('label', 32);
            $table->timestamps();
            $table->unique(['customer_user_id', 'label'], 'customer_tags_customer_label_unique');
            $table->index('label', 'customer_tags_label_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_tags');
    }
};
