<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class AuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! session()->has('user_id')) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['error' => 'Não autenticado']);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null) {}
}