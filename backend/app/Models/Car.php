<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Car extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'brand', 'model', 'year', 'km', 'price', 'color',
        'fuel', 'transmission', 'category', 'image_url',
        'images', 'description', 'sold', 'featured', 'sort_order',
    ];

    protected $casts = [
        'images'     => 'array',
        'sold'       => 'boolean',
        'featured'   => 'boolean',
        'year'       => 'integer',
        'km'         => 'integer',
        'sort_order' => 'integer',
        'price'      => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::creating(function (Car $car) {
            if (empty($car->id)) {
                $car->id = (string) Str::uuid();
            }
        });
    }
}
