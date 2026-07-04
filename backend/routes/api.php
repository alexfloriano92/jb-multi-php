<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CarController;
use App\Http\Controllers\UploadController;

// ─── Público ────────────────────────────────────────────────
Route::post('auth/login', [AuthController::class, 'login']);

Route::get('cars',        [CarController::class, 'index']);
Route::get('cars/{car}',  [CarController::class, 'show']);

// ─── Autenticado (JWT) ──────────────────────────────────────
Route::middleware('auth:api')->group(function () {
    Route::get ('auth/me',      [AuthController::class, 'me']);
    Route::post('auth/logout',  [AuthController::class, 'logout']);
    Route::post('auth/refresh', [AuthController::class, 'refresh']);

    // Admin
    Route::middleware('admin')->group(function () {
        Route::post  ('cars',           [CarController::class, 'store']);
        Route::put   ('cars/{car}',     [CarController::class, 'update']);
        Route::patch ('cars/{car}',     [CarController::class, 'update']);
        Route::delete('cars/{car}',     [CarController::class, 'destroy']);
        Route::post  ('uploads/car',    [UploadController::class, 'car']);
    });
});
