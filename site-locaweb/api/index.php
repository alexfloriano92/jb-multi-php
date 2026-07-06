<?php
/**
 * Bridge do CodeIgniter 4 para rodar dentro de public_html/api/
 * O código do CI fica em /home/jbmultimarcaas2/ci/ (fora do público).
 */

define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);

$pathsPath = realpath(FCPATH . '../../ci/app/Config/Paths.php');
if ($pathsPath === false) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Arquivo Paths.php não encontrado. Confira se a pasta ci/ existe em /home/jbmultimarcaas2/ci/',
    ]);
    exit;
}

require $pathsPath;

$paths = new Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';

$app = \Config\Services::codeigniter();
$app->initialize();
$app->setContext(is_cli() ? 'php-cli' : 'web');
$app->run();