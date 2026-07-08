<?php

namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;

class Uploads extends ResourceController
{
    protected $format = 'json';

    public function car(): ResponseInterface
    {
        $file = $this->request->getFile('file');
        if (! $file || ! $file->isValid()) {
            return $this->failValidationErrors('Arquivo inválido.');
        }
        if ($file->getSize() > 8 * 1024 * 1024) {
            return $this->failValidationErrors('Arquivo maior que 8MB.');
        }
        $mime = strtolower((string) $file->getMimeType());
        $ext  = strtolower((string) $file->getExtension());
        $okMimes = ['image/jpeg','image/jpg','image/pjpeg','image/png','image/webp','image/gif'];
        $okExts  = ['jpg','jpeg','png','webp','gif'];
        if (! in_array($mime, $okMimes, true) && ! in_array($ext, $okExts, true)) {
            return $this->failValidationErrors('Formato não suportado ('.$mime.' / .'.$ext.').');
        }

        // Na Locaweb o FCPATH aponta para public_html/api/ (bridge do CI).
        // Precisamos gravar na raiz pública (public_html/uploads/cars/) para
        // que a URL https://dominio/uploads/cars/xxx.jpg realmente exista.
        $publicRoot = realpath(FCPATH . '..') ?: dirname(FCPATH);
        $dir = rtrim($publicRoot, '/\\') . DIRECTORY_SEPARATOR . 'uploads'
             . DIRECTORY_SEPARATOR . 'cars' . DIRECTORY_SEPARATOR;
        if (! is_dir($dir)) mkdir($dir, 0775, true);

        $name = $file->getRandomName();
        $file->move($dir, $name);

        // base_url() do CI aponta para .../api/ (por causa da bridge).
        // Removemos o sufixo /api para que a URL fique na raiz do site.
        $base = rtrim(base_url(), '/');
        $base = preg_replace('#/api$#', '', $base);
        $url  = $base . '/uploads/cars/' . $name;
        return $this->respondCreated(['url' => $url]);
    }
}