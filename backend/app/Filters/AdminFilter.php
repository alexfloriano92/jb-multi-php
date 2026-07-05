<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class AdminFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (session()->get('user_role') !== 'admin') {
            return service('response')
                ->setStatusCode(403)
                ->setJSON(['error' => 'Acesso restrito ao administrador']);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null) {}
}