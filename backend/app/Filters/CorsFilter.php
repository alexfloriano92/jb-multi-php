<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * CORS mínimo com credenciais. Aceita origens listadas em
 * `app.corsAllowedOrigins` (separadas por vírgula).
 */
class CorsFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $response = service('response');
        $origin   = $request->getHeaderLine('Origin');
        $allowed  = array_filter(array_map('trim',
            explode(',', (string) config('App')->corsAllowedOrigins ?? '')));

        if ($origin && in_array($origin, $allowed, true)) {
            $response->setHeader('Access-Control-Allow-Origin', $origin);
            $response->setHeader('Vary', 'Origin');
            $response->setHeader('Access-Control-Allow-Credentials', 'true');
            $response->setHeader('Access-Control-Allow-Methods',
                'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->setHeader('Access-Control-Allow-Headers',
                'Content-Type, Accept, X-Requested-With');
            $response->setHeader('Access-Control-Max-Age', '86400');
        }

        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            return $response->setStatusCode(204);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // headers já setados no before()
    }
}