<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            /** Captured at booking time so later catalog changes don't shift owed deposit. */
            $table->unsignedInteger('deposit_cents')->default(0)->after('notes');
            /**
             * Lifecycle:
             *   not_required → no deposit needed (deposit_cents = 0)
             *   requires_payment → deposit owed, intent created, awaiting confirmation
             *   processing → confirmation in flight (Stripe processing)
             *   paid → captured successfully
             *   failed → last attempt failed; user may retry
             *   refunded → refunded after cancellation
             */
            $table->string('payment_status', 32)->default('not_required')->after('deposit_cents');
            $table->string('payment_intent_id', 255)->nullable()->after('payment_status');
            $table->unsignedInteger('amount_paid_cents')->default(0)->after('payment_intent_id');
            $table->dateTime('paid_at')->nullable()->after('amount_paid_cents');
            $table->dateTime('refunded_at')->nullable()->after('paid_at');

            $table->index('payment_intent_id');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['payment_intent_id']);
            $table->dropColumn([
                'deposit_cents',
                'payment_status',
                'payment_intent_id',
                'amount_paid_cents',
                'paid_at',
                'refunded_at',
            ]);
        });
    }
};
