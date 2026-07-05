<?php

namespace App\Models;

use CodeIgniter\Model;

class CarModel extends Model
{
    protected $table         = 'cars';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = true;
    protected $useAutoIncrement = false;

    protected $allowedFields = [
        'id', 'brand', 'model', 'year', 'km', 'price', 'color',
        'fuel', 'transmission', 'category', 'image_url', 'images',
        'description', 'sold', 'featured', 'sort_order',
    ];

    /**
     * Normaliza para JSON antes de gravar e de volta ao ler.
     */
    protected $beforeInsert = ['encodeImages'];
    protected $beforeUpdate = ['encodeImages'];
    protected $afterFind    = ['decodeImages'];

    protected function encodeImages(array $data): array
    {
        if (isset($data['data']['images']) && is_array($data['data']['images'])) {
            $data['data']['images'] = json_encode(array_values($data['data']['images']));
        }
        return $data;
    }

    protected function decodeImages(array $data): array
    {
        $decode = static function (array $row): array {
            if (isset($row['images']) && is_string($row['images'])) {
                $row['images'] = json_decode($row['images'], true) ?: [];
            }
            $row['sold']       = (bool) ($row['sold']     ?? false);
            $row['featured']   = (bool) ($row['featured'] ?? false);
            $row['year']       = (int)  ($row['year']     ?? 0);
            $row['km']         = (int)  ($row['km']       ?? 0);
            $row['sort_order'] = (int)  ($row['sort_order'] ?? 0);
            $row['price']      = isset($row['price']) && $row['price'] !== null
                                    ? (float) $row['price'] : null;
            return $row;
        };

        if (isset($data['data'])) {
            if (isset($data['data'][0])) {
                $data['data'] = array_map($decode, $data['data']);
            } else {
                $data['data'] = $decode($data['data']);
            }
        }
        return $data;
    }
}