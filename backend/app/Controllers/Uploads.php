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

        // Diretório físico: public_html/uploads/cars/
        // FCPATH aponta para o public/ do Laravel/CI. Na Locaweb, o
        // public_html/index.php aponta FCPATH para o próprio public_html.
        $dir = FCPATH . 'uploads/cars/';
        if (! is_dir($dir)) mkdir($dir, 0775, true);

        $name = $file->getRandomName();
        $file->move($dir, $name);

        $url = rtrim(base_url(), '/') . '/uploads/cars/' . $name;
        return $this->respondCreated(['url' => $url]);
    }
}