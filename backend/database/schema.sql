-- ─────────────────────────────────────────────
-- JB Multimarcas — dump inicial (MySQL 8 / MariaDB)
-- Use este arquivo se preferir importar via phpMyAdmin
-- em vez de rodar `php artisan migrate`.
-- ─────────────────────────────────────────────

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `users` (
    `id`                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name`              VARCHAR(255) NOT NULL,
    `email`             VARCHAR(255) NOT NULL UNIQUE,
    `email_verified_at` TIMESTAMP NULL,
    `password`          VARCHAR(255) NOT NULL,
    `role`              VARCHAR(20)  NOT NULL DEFAULT 'user',
    `remember_token`    VARCHAR(100) NULL,
    `created_at`        TIMESTAMP NULL,
    `updated_at`        TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `password_reset_tokens` (
    `email`      VARCHAR(255) NOT NULL PRIMARY KEY,
    `token`      VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `cars` (
    `id`           CHAR(36) NOT NULL PRIMARY KEY,
    `brand`        VARCHAR(80)  NOT NULL,
    `model`        VARCHAR(120) NOT NULL,
    `year`         SMALLINT UNSIGNED NOT NULL,
    `km`           INT UNSIGNED NOT NULL DEFAULT 0,
    `price`        DECIMAL(12,2) NULL,
    `color`        VARCHAR(40)  NULL,
    `fuel`         VARCHAR(20)  NULL,
    `transmission` VARCHAR(20)  NULL,
    `category`     VARCHAR(80)  NOT NULL DEFAULT 'seminovo',
    `image_url`    VARCHAR(500) NULL,
    `images`       JSON NULL,
    `description`  TEXT NULL,
    `sold`         TINYINT(1) NOT NULL DEFAULT 0,
    `featured`     TINYINT(1) NOT NULL DEFAULT 0,
    `sort_order`   INT NOT NULL DEFAULT 0,
    `created_at`   TIMESTAMP NULL,
    `updated_at`   TIMESTAMP NULL,
    INDEX `cars_sort_created_idx` (`sort_order`, `created_at`),
    INDEX `cars_featured_idx` (`featured`),
    INDEX `cars_sold_idx` (`sold`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin padrão (senha: admin123)
-- Bcrypt gerado com: password_hash('admin123', PASSWORD_BCRYPT)
INSERT INTO `users` (`name`, `email`, `password`, `role`, `created_at`, `updated_at`)
VALUES ('Administrador JB', 'admin@jbmultimarcas.com.br',
        '$2y$12$LxQvVj0eYb.tFvDx3wUCQuPO0R7v.gVW2v9dLcU8UZjNfNhK1c8yG',
        'admin', NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
