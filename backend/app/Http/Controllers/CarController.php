<?php

namespace App\Http\Controllers;

use App\Models\Car;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CarController extends Controller
{
    public function index(): JsonResponse
    {
        $cars = Car::orderBy('sort_order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($cars);
    }

    public function show(Car $car): JsonResponse
    {
        return response()->json($car);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $car  = Car::create($data);
        return response()->json($car, 201);
    }

    public function update(Request $request, Car $car): JsonResponse
    {
        $data = $this->validated($request, updating: true);
        $car->update($data);
        return response()->json($car);
    }

    public function destroy(Car $car): JsonResponse
    {
        $car->delete();
        return response()->json(['message' => 'ok']);
    }

    private function validated(Request $request, bool $updating = false): array
    {
        $rule = $updating ? 'sometimes' : 'required';
        return $request->validate([
            'brand'        => "$rule|string|max:80",
            'model'        => "$rule|string|max:120",
            'year'         => "$rule|integer|min:1950|max:2100",
            'km'           => 'sometimes|integer|min:0',
            'price'        => 'nullable|numeric|min:0',
            'color'        => 'nullable|string|max:40',
            'fuel'         => 'nullable|string|max:20',
            'transmission' => 'nullable|string|max:20',
            'category'     => 'sometimes|string|max:80',
            'image_url'    => 'nullable|string|max:500',
            'images'       => 'nullable|array',
            'images.*'     => 'string|max:500',
            'description'  => 'nullable|string',
            'sold'         => 'sometimes|boolean',
            'featured'     => 'sometimes|boolean',
            'sort_order'   => 'sometimes|integer',
        ]);
    }
}
