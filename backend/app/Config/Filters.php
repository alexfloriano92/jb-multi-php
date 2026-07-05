<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;
use CodeIgniter\Filters\Cors;
use CodeIgniter\Filters\CSRF;
use CodeIgniter\Filters\DebugToolbar;
use CodeIgniter\Filters\Honeypot;
use CodeIgniter\Filters\InvalidChars;
use CodeIgniter\Filters\PageCache;
use CodeIgniter\Filters\PerformanceMetrics;
use CodeIgniter\Filters\SecureHeaders;

use App\Filters\AuthFilter;
use App\Filters\AdminFilter;
use App\Filters\CorsFilter;

class Filters extends BaseConfig
{
    /**
     * Aliases usados nas rotas (app/Config/Routes.php).
     */
    public array $aliases = [
        'csrf'          => CSRF::class,
        'toolbar'       => DebugToolbar::class,
        'honeypot'      => Honeypot::class,
        'invalidchars'  => InvalidChars::class,
        'secureheaders' => SecureHeaders::class,
        'cors'          => CorsFilter::class,
        'auth'          => AuthFilter::class,
        'admin'         => AdminFilter::class,
        'pagecache'     => PageCache::class,
        'performance'   => PerformanceMetrics::class,
    ];

    /**
     * Filtros globais — CSRF DESLIGADO porque autenticamos por sessão
     * com CORS controlado. Se quiser proteção extra, ative CSRF só para
     * as rotas web (não a API).
     */
    public array $globals = [
        'before' => [
            // 'honeypot',
            // 'invalidchars',
        ],
        'after' => [
            'toolbar',
            // 'honeypot',
            // 'secureheaders',
        ],
    ];

    public array $methods = [];
    public array $filters = [];
    public array $required = [
        'before' => [
            'forcehttps',
            'pagecache',
        ],
        'after' => [
            'pagecache',
            'performance',
        ],
    ];
}