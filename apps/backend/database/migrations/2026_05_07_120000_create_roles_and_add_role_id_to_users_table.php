<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });

        $now = now();
        DB::table('roles')->insert([
            ['name' => 'Customer', 'slug' => 'customer', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Barber', 'slug' => 'barber', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Admin', 'slug' => 'admin', 'created_at' => $now, 'updated_at' => $now],
        ]);

        $customerId = (int) DB::table('roles')->where('slug', 'customer')->value('id');

        Schema::table('users', function (Blueprint $table) use ($customerId) {
            $table->foreignId('role_id')
                ->default($customerId)
                ->constrained()
                ->cascadeOnUpdate()
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });

        Schema::dropIfExists('roles');
    }
};
