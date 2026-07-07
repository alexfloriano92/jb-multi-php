<?php
/**
 * Bridge do CodeIgniter 4 para rodar dentro de public_html/api/
 * O código do CI fica em /home/jbmultimarcaas2/ci/ (fora do público).
 * Compatível com CodeIgniter 4.5+
 */

// Path do FrontController (esta pasta public_html/api/)
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);

if (isset($_GET['check_bridge'])) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok' => true,
        'bridge' => 'jb_multimarcas_ci45',
        'version' => '2026-07-07-bootphp',
    ]);
    exit;
}

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

// Boot padrão do CI 4.5+ — usa a classe Boot em vez do antigo system/bootstrap.php
require realpath($paths->systemDirectory . '/Boot.php')
    ?: $paths->systemDirectory . '/Boot.php';

exit(CodeIgniter\Boot::bootWeb($paths));