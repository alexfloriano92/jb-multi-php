<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */

// A pasta pública já é /api/. Dentro do CodeIgniter a URI chega como "cars",
// não como "api/cars". Por isso as rotas ficam na raiz.
$routes->options('(:any)', static function () {
    return service('response')->setStatusCode(204);
}, ['filter' => 'cors']);

// ─── Público ─────────────────────────────────────────
$routes->post('auth/login', 'Auth::login', ['filter' => 'cors']);

$routes->get('cars', 'Cars::index', ['filter' => 'cors']);
$routes->get('cars/(:segment)', 'Cars::show/$1', ['filter' => 'cors']);

// ─── Autenticado (sessão) ────────────────────────────
$routes->group('', ['filter' => 'cors,auth'], static function ($routes) {
    $routes->get ('auth/me',     'Auth::me');
    $routes->post('auth/logout', 'Auth::logout');

    // Admin
    $routes->group('', ['filter' => 'admin'], static function ($routes) {
        $routes->post  ('cars',              'Cars::create');
        $routes->put   ('cars/(:segment)',   'Cars::update/$1');
        $routes->patch ('cars/(:segment)',   'Cars::update/$1');
        $routes->delete('cars/(:segment)',   'Cars::delete/$1');
        $routes->post  ('uploads/car',       'Uploads::car');
    });
});

// Fallback do frontend (SPA) — não usado quando o React é servido pelo
// Apache. Existe só para dev quando você acessa a API diretamente.
$routes->get('/', static function () {
    return service('response')->setJSON(['ok' => true, 'api' => 'JB Multimarcas']);
});