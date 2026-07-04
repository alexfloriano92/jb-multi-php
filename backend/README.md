# JB Multimarcas — Backend PHP (Laravel 11)

API REST em Laravel 11 com autenticação JWT, CRUD de veículos e upload de imagens.
Compatível com **Locaweb Hospedagem Go compartilhada** (PHP 8.2+ / MySQL).

---

## 1. Instalação local (uma vez)

Este diretório contém **apenas os arquivos específicos da aplicação**. Você precisa
gerar o esqueleto do Laravel e mesclar por cima:

```bash
cd ..
composer create-project laravel/laravel backend-tmp "^11.0"
# Copia os arquivos que já estão aqui por cima do esqueleto:
cp -r backend/* backend-tmp/
cp -r backend/.env.example backend-tmp/.env
rm -rf backend
mv backend-tmp backend
cd backend

# Dependências extras:
composer require tymon/jwt-auth
composer require fruitcake/laravel-cors  # já vem no Laravel 11, pular se der conflito

# Chaves:
php artisan key:generate
php artisan jwt:secret

# Banco (ajuste .env antes):
php artisan migrate --seed
```

O seeder cria um admin padrão:
- **email**: `admin@jbmultimarcas.com.br`
- **senha**: `admin123` (troque no primeiro login!)

## 2. Configuração `.env`

```
APP_NAME="JB Multimarcas API"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://seudominio.com.br

DB_CONNECTION=mysql
DB_HOST=mysqlXXX.locaweb.com.br   # host que a Locaweb fornece
DB_PORT=3306
DB_DATABASE=seubanco
DB_USERNAME=seuusuario
DB_PASSWORD=suasenha

JWT_SECRET=          # gerado pelo `php artisan jwt:secret`
JWT_TTL=1440         # 24h

FILESYSTEM_DISK=public
```

## 3. Deploy na Locaweb Go (Hospedagem Compartilhada)

A Locaweb Go **não permite** rodar `composer` no servidor nem ter a pasta `public`
separada. Solução padrão:

### 3.1. Preparar antes do upload

```bash
# Instalar dependências de produção (localmente):
composer install --optimize-autoloader --no-dev

# Otimizar caches:
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 3.2. Estrutura no servidor

No painel da Locaweb, seu domínio aponta para `public_html/` (ou `www/`).
Suba assim:

```
public_html/         <- conteúdo da pasta backend/public/ vai AQUI
  index.php
  .htaccess
  uploads/
  ...
api/                 <- resto do Laravel (fora do public_html)
  app/
  bootstrap/
  config/
  database/
  routes/
  storage/
  vendor/
  .env
  artisan
```

Depois **edite `public_html/index.php`** e troque estas duas linhas:

```php
require __DIR__.'/../api/vendor/autoload.php';
$app = require_once __DIR__.'/../api/bootstrap/app.php';
```

E em `public_html/index.php` (Laravel 11 usa outro formato):

```php
require __DIR__.'/../api/vendor/autoload.php';
$app = require_once __DIR__.'/../api/bootstrap/app.php';
$app->handleRequest(Request::capture());
```

### 3.3. Permissões

No FTP dê `775` para:
- `api/storage/` e todos os subdirs
- `api/bootstrap/cache/`
- `public_html/uploads/cars/`

### 3.4. Banco de dados

Crie o MySQL no painel Locaweb, e rode as migrations **localmente apontando para o
banco de produção** (ou importe o `.sql` do `database/schema.sql` via phpMyAdmin
da Locaweb).

## 4. Endpoints

Todas as rotas ficam sob `/api`.

### Autenticação

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST   | `/api/auth/login`   | público  | body: `{email,password}` → `{token,user}` |
| POST   | `/api/auth/logout`  | JWT      | invalida o token |
| GET    | `/api/auth/me`      | JWT      | retorna usuário logado |
| POST   | `/api/auth/refresh` | JWT      | renova token |

### Veículos

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET    | `/api/cars`        | público | lista pública |
| GET    | `/api/cars/{id}`   | público | detalhe |
| POST   | `/api/cars`        | JWT admin | cria |
| PUT    | `/api/cars/{id}`   | JWT admin | atualiza |
| DELETE | `/api/cars/{id}`   | JWT admin | remove |
| POST   | `/api/uploads/car` | JWT admin | multipart `file` → `{url}` |

## 5. CORS

Configurado em `config/cors.php` para aceitar o domínio do frontend.
Ajuste `allowed_origins` em produção.

## 6. Frontend

O frontend React foi adaptado para consumir esta API via `VITE_API_URL`.
Configure no `.env` do projeto raiz:

```
VITE_API_URL=https://seudominio.com.br/api
```