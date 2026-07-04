<?php
use Illuminate\Support\Facades\Route;
Route::get('/', fn () => response()->json(['app' => 'JB Multimarcas API', 'status' => 'ok']));
