<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('cars', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('brand', 80);
            $t->string('model', 120);
            $t->unsignedSmallInteger('year');
            $t->unsignedInteger('km')->default(0);
            $t->decimal('price', 12, 2)->nullable();
            $t->string('color', 40)->nullable();
            $t->string('fuel', 20)->nullable();
            $t->string('transmission', 20)->nullable();
            $t->string('category', 80)->default('seminovo');
            $t->string('image_url', 500)->nullable();
            $t->json('images')->nullable();
            $t->text('description')->nullable();
            $t->boolean('sold')->default(false);
            $t->boolean('featured')->default(false);
            $t->integer('sort_order')->default(0);
            $t->timestamps();

            $t->index(['sort_order', 'created_at']);
            $t->index('featured');
            $t->index('sold');
        });
    }
    public function down(): void { Schema::dropIfExists('cars'); }
};
