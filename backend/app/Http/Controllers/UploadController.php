<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function car(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|image|mimes:jpg,jpeg,png,webp|max:8192',
        ]);

        $file = $request->file('file');
        $ext  = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $name = Str::uuid()->toString() . '.' . $ext;

        // Salva em public/uploads/cars (servido diretamente pelo Apache)
        $destination = public_path('uploads/cars');
        if (! is_dir($destination)) {
            mkdir($destination, 0775, true);
        }
        $file->move($destination, $name);

        $url = rtrim(config('app.url'), '/') . '/uploads/cars/' . $name;

        return response()->json(['url' => $url, 'path' => "uploads/cars/$name"]);
    }
}
