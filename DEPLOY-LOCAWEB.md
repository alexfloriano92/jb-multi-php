# 🚀 Deploy Completo — JB Multimarcas na Locaweb

Guia passo a passo, do zero, para publicar **frontend (React) + backend (Laravel + MySQL)**
na Hospedagem **Locaweb Go / cPanel** usando o domínio **`jbmultimarcaas.com.br`**.

Tudo foi feito assumindo que você está no **Windows** com o projeto na pasta
`C:\Projetos\jb-multimarcas\` (ajuste se for outra).

---

## 📋 Dados usados neste guia

| Item | Valor |
|---|---|
| Domínio | `jbmultimarcaas.com.br` |
| Banco (nome) | `jbmulti` |
| Banco (usuário) | `jbadmin` |
| Banco (senha) | `Vodin4s@` |
| Banco (host) | `localhost` |
| Admin do site | `admin@jbmultimarcas.com.br` / `admin123` |

> ⚠️ Troque a senha do admin no primeiro login.

---

## 🧰 PARTE 0 — Instalar ferramentas no Windows (uma vez)

1. **Node.js 20+** → https://nodejs.org (instalador LTS, clique *Next* em tudo).
   - Testar no CMD: `node -v` e `npm -v`
2. **PHP 8.2+** → https://windows.php.net/download/ (versão *Thread Safe x64*).
   - Extraia em `C:\php` e adicione ao **PATH**:
     `Painel → Sistema → Configurações avançadas → Variáveis de Ambiente → Path → Editar → Novo → C:\php`
   - Testar: `php -v`
3. **Composer** → https://getcomposer.org/Composer-Setup.exe (aponte para `C:\php\php.exe`).
   - Testar: `composer -V`
4. **FileZilla** (FTP) → https://filezilla-project.org/
5. **Credenciais da Locaweb** em mãos:
   - Login do **cPanel** (`https://cpanel.jbmultimarcaas.com.br` normalmente)
   - FTP: host, usuário, senha
   - (Opcional) SSH: host, usuário, senha

---

## 🗄️ PARTE 1 — Criar o banco de dados no cPanel

**Caminho:** `cPanel → Bancos de Dados → Bancos de dados MySQL®`

1. **Criar banco**
   - Nome: `jbmulti` → clicar **Criar Banco de Dados**
   - O cPanel prefixa com seu usuário; ficará algo como **`jbmultimarcaas2_jbmulti`**. Anote.
2. **Criar usuário MySQL** (mesma tela, mais abaixo)
   - Usuário: `jbadmin` → prefixado: **`jbmultimarcaas2_jbadmin`**
   - Senha: `Vodin4s@` → **Criar Usuário**
3. **Adicionar usuário ao banco**
   - Selecione o usuário e o banco → **Adicionar**
   - Marque **ALL PRIVILEGES** → **Fazer Alterações**

> 📝 Anote os nomes **com prefixo** — é isso que vai no `.env`.
> Se o cPanel da sua conta **não usa prefixo**, use `jbmulti` / `jbadmin` puros.

---

## 📁 PARTE 2 — Estrutura de pastas no servidor

```
/home/jbmultimarcaas2/
├── laravel/              ← código do Laravel (FORA do público)
│   ├── app/  bootstrap/  config/  database/  routes/  storage/  vendor/
│   ├── .env
│   └── artisan
└── public_html/          ← o que o navegador enxerga
    ├── index.html        ← React (SPA)
    ├── index.php         ← Laravel bootstrap adaptado
    ├── .htaccess         ← roteia /api → Laravel, resto → React
    ├── assets/           ← JS/CSS do React
    └── uploads/cars/     ← fotos dos veículos
```

---

## ⚙️ PARTE 3 — Preparar o backend (Laravel) no Windows

Abra o **CMD** na pasta do projeto:

```cmd
cd C:\Projetos\jb-multimarcas\backend
```

### 3.1. Instalar dependências de produção

```cmd
composer install --optimize-autoloader --no-dev
```

### 3.2. Criar o arquivo `.env` de produção

```cmd
copy .env.example .env
```

Abra `backend\.env` no Bloco de Notas e confirme:

```env
APP_NAME="JB Multimarcas API"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://jbmultimarcaas.com.br

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=jbmulti          # ou jbmultimarcaas2_jbmulti se o cPanel prefixar
DB_USERNAME=jbadmin          # ou jbmultimarcaas2_jbadmin
DB_PASSWORD=Vodin4s@

JWT_SECRET=
JWT_TTL=1440

CORS_ALLOWED_ORIGINS=https://jbmultimarcaas.com.br,https://www.jbmultimarcaas.com.br

ADMIN_EMAIL=admin@jbmultimarcas.com.br
ADMIN_PASSWORD=admin123
```

### 3.3. Gerar chaves

```cmd
php artisan key:generate
php artisan jwt:secret
```

### 3.4. Otimizar caches

```cmd
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 🎨 PARTE 4 — Buildar o frontend (React) no Windows

```cmd
cd C:\Projetos\jb-multimarcas
```

O arquivo `.env.production` já está com:

```env
VITE_API_URL="https://jbmultimarcaas.com.br/api"
```

Gere o build:

```cmd
npm install
npm run build
```

Isso cria a pasta `dist\` — é ela que vai para o `public_html`.

---

## 🔗 PARTE 5 — Adaptar o `index.php` do Laravel

Copie `backend\public\index.php` para `backend\public\index-prod.php` e troque
os caminhos para apontar **um nível acima** do `public_html`:

```php
<?php
use Illuminate\Http\Request;
define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = __DIR__.'/../laravel/storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/../laravel/vendor/autoload.php';

(require_once __DIR__.'/../laravel/bootstrap/app.php')
    ->handleRequest(Request::capture());
```

---

## 📤 PARTE 6 — Upload via FileZilla

**Caminho no FileZilla:** `Arquivo → Gerenciador de Sites → Novo Site`
- Host: (o que a Locaweb passou, ex.: `ftp.jbmultimarcaas.com.br`)
- Usuário / Senha: (do FTP)
- Conectar

### 6.1. Enviar o Laravel para `/home/jbmultimarcaas2/laravel/`

No painel direito (servidor), suba um nível acima de `public_html`, crie a pasta
`laravel/` e envie **todo o conteúdo de `C:\Projetos\jb-multimarcas\backend\`
EXCETO a pasta `public\`**.

### 6.2. Enviar o frontend + bridge para `public_html/`

Dentro de `public_html/`:
1. Envie **todo o conteúdo de `C:\Projetos\jb-multimarcas\dist\`**
2. Envie `C:\Projetos\jb-multimarcas\backend\public\index-prod.php` e
   **renomeie para `index.php`** no servidor
3. Envie `C:\Projetos\jb-multimarcas\backend\public\.htaccess-locaweb` e
   **renomeie para `.htaccess`** no servidor
4. Crie a pasta `uploads/cars/` (vazia)

---

## 🗃️ PARTE 7 — Rodar as migrations no banco de produção

### Opção A — Com SSH (recomendado)

No CMD do Windows:

```cmd
ssh jbmultimarcaas2@jbmultimarcaas.com.br
cd laravel
php artisan migrate --seed --force
```

### Opção B — Sem SSH, via phpMyAdmin

**Caminho:** `cPanel → Bancos de Dados → phpMyAdmin`

1. Selecione o banco `jbmultimarcaas2_jbmulti` na esquerda
2. Aba **Importar** → escolha o arquivo
   `C:\Projetos\jb-multimarcas\backend\database\schema.sql` → **Executar**
3. Isso cria as tabelas E o usuário admin (`admin@jbmultimarcas.com.br` / `admin123`)

---

## 🔐 PARTE 8 — Permissões (via FileZilla)

Clique com o **botão direito** em cada pasta abaixo → **Permissões de arquivo** → `775`
e marque **Recorrer aos subdiretórios**:

- `laravel/storage/`
- `laravel/bootstrap/cache/`
- `public_html/uploads/`

---

## ✅ PARTE 9 — Testar

Abra no navegador:

| URL | Deve mostrar |
|---|---|
| `https://jbmultimarcaas.com.br` | Site JB Multimarcas |
| `https://jbmultimarcaas.com.br/api/cars` | `[]` (JSON vazio) |
| `https://jbmultimarcaas.com.br/auth` | Tela de login |

Faça login com **`admin@jbmultimarcas.com.br` / `admin123`**, cadastre um
veículo com foto, e confira em `/`.

---

## 🆘 Se algo der errado

| Sintoma | Causa provável | Solução |
|---|---|---|
| **Erro 500** ao abrir o site | Permissões ou `.env` errado | `chmod 775 storage bootstrap/cache` e conferir credenciais do banco |
| **/api/cars retorna HTML** | `.htaccess` não subiu / mod_rewrite off | Reenviar `.htaccess` e ativar mod_rewrite no cPanel |
| **CORS bloqueado no console** | Domínio errado em `CORS_ALLOWED_ORIGINS` | Editar `.env` e rodar `php artisan config:cache` |
| **Login "Failed to fetch"** | `VITE_API_URL` errado no build | Ajustar `.env.production`, `npm run build` e reenviar `dist/` |
| **"No application encryption key"** | Faltou rodar `php artisan key:generate` | Rodar localmente e reenviar `.env` |
| **Erro de conexão MySQL** | Nome do banco/usuário sem prefixo | Trocar para `jbmultimarcaas2_jbmulti` / `jbmultimarcaas2_jbadmin` |

---

## 📌 Checklist final

- [ ] Banco `jbmulti` criado no cPanel com usuário `jbadmin`
- [ ] `backend\.env` com credenciais corretas + `APP_KEY` + `JWT_SECRET`
- [ ] `composer install --no-dev` rodado
- [ ] `npm run build` gerou `dist/`
- [ ] `laravel/` enviado FORA do `public_html`
- [ ] `dist/` + `index.php` (adaptado) + `.htaccess` dentro de `public_html`
- [ ] Migrations rodadas (SSH ou schema.sql)
- [ ] Permissões 775 em `storage`, `bootstrap/cache`, `uploads`
- [ ] `/api/cars` responde `[]`
- [ ] Login admin funciona
- [ ] Senha do admin trocada