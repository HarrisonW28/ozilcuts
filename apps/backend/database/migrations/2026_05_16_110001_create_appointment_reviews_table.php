<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEX_NAME = 'appt_reviews_barber_pub_verified_idx';

    public function up(): void
    {
        if (! Schema::hasTable('appointment_reviews')) {
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

                $table->index(
                    ['barber_user_id', 'is_published', 'verified_at'],
                    self::INDEX_NAME,
                );
            });

            return;
        }

        if (! $this->indexExists('appointment_reviews', self::INDEX_NAME)) {
            Schema::table('appointment_reviews', function (Blueprint $table) {
                $table->index(
                    ['barber_user_id', 'is_published', 'verified_at'],
                    self::INDEX_NAME,
                );
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_reviews');
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $rows = DB::select('SHOW INDEX FROM `'.$table.'` WHERE Key_name = ?', [$indexName]);

        return $rows !== [];
    }
};
