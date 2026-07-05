<?php

namespace App\Controllers;

use App\Models\CarModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;

class Cars extends ResourceController
{
    protected $format    = 'json';
    protected $modelName = CarModel::class;

    public function index(): ResponseInterface
    {
        $rows = $this->model
            ->orderBy('sort_order', 'ASC')
            ->orderBy('created_at', 'DESC')
            ->findAll();
        return $this->respond($rows);
    }

    public function show($id = null): ResponseInterface
    {
        $car = $this->model->find($id);
        if (! $car) return $this->failNotFound('Veículo não encontrado.');
        return $this->respond($car);
    }

    public function create(): ResponseInterface
    {
        $data = $this->payload();
        if (! $data['brand'] || ! $data['model']) {
            return $this->failValidationErrors('Marca e modelo são obrigatórios.');
        }
        $data['id'] = $this->uuid();
        $this->model->insert($data, false);
        return $this->respondCreated($this->model->find($data['id']));
    }

    public function update($id = null): ResponseInterface
    {
        if (! $this->model->find($id)) return $this->failNotFound('Veículo não encontrado.');
        $this->model->update($id, $this->payload(true));
        return $this->respond($this->model->find($id));
    }

    public function delete($id = null): ResponseInterface
    {
        if (! $this->model->find($id)) return $this->failNotFound('Veículo não encontrado.');
        $this->model->delete($id);
        return $this->respondDeleted(['ok' => true]);
    }

    private function payload(bool $partial = false): array
    {
        $in = $this->request->getJSON(true) ?? $this->request->getPost();
        $fields = [
            'brand', 'model', 'year', 'km', 'price', 'color', 'fuel',
            'transmission', 'category', 'image_url', 'images', 'description',
            'sold', 'featured', 'sort_order',
        ];
        $out = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $in)) $out[$f] = $in[$f];
        }
        if (isset($out['sold']))     $out['sold']     = $out['sold']     ? 1 : 0;
        if (isset($out['featured'])) $out['featured'] = $out['featured'] ? 1 : 0;
        if (isset($out['images']) && ! is_array($out['images'])) {
            $out['images'] = [];
        }
        return $out;
    }

    private function uuid(): string
    {
        $d = random_bytes(16);
        $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
        $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
    }
}