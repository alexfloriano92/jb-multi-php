# 🚀 Deploy Completo — JB Multimarcas na Locaweb

Guia passo a passo para publicar **frontend (React) + backend (CodeIgniter 4 + MySQL)**
na Hospedagem **Locaweb Go / cPanel** usando o domínio **`jbmultimarcaas.com.br`**.

Tudo assume que você está no **Windows** com o projeto em `C:\Users\User\jb-multi-php\`.

---

## 📋 Dados usados neste guia

| Item | Valor |
|---|---|
| Domínio | `jbmultimarcaas.com.br` |
| Usuário cPanel/FTP | `jbmultimarcaas2` |
| Host FTP | `ftp.jbmultimarcaas.com.br` (porta 21) |
| Pasta raiz no servidor | `/home/jbmultimarcaas2/` |
| Banco (nome) | `jbmulti` → `jbmultimarcaas2_jbmulti` |
| Banco (usuário) | `jbadmin` → `jbmultimarcaas2_jbadmin` |
| Banco (senha) | `Vodin4s@` |
| Banco (host) | `localhost` |
| Admin do site | `admin@jbmultimarcas.com.br` / `admin123` |

> ⚠️ Troque a senha do admin no primeiro login.

---

## 🧰 PARTE 0 — Ferramentas no Windows (uma vez)

1. **Node.js 20+** → https://nodejs.org — testar: `node -v`
2. **PHP 8.1+** → https://windows.php.net/download/ (Thread Safe x64). Extraia em `C:\php`, adicione ao PATH. Testar: `php -v`
3. **Composer** → https://getcomposer.org/Composer-Setup.exe (aponte para `C:\php\php.exe`)
4. **FileZilla** → https://filezilla-project.org/

---

## 🗄️ PARTE 1 — Criar o banco de dados no cPanel

`cPanel → Bancos de Dados → Bancos de dados MySQL®`

1. **Criar banco** → nome `jbmulti` (fica **`jbmultimarcaas2_jbmulti`**)
2. **Criar usuário** → `jbadmin` (fica **`jbmultimarcaas2_jbadmin`**), senha `Vodin4s@`
3. **Adicionar usuário ao banco** → marcar **ALL PRIVILEGES**

---

## 📁 PARTE 2 — Estrutura no servidor

```
/home/jbmultimarcaas2/
├── ci/                   ← CodeIgniter (FORA do público)
│   ├── app/  system/  vendor/  writable/
│   ├── .env
│   └── spark
└── public_html/          ← o que o navegador enxerga
    ├── index.html        ← React (SPA)
    ├── assets/           ← JS/CSS do React
    ├── uploads/cars/     ← fotos dos veículos
    └── api/              ← bridge do CodeIgniter
        ├── index.php     ← copiado de ci/public/index.php e adaptado
        └── .htaccess     ← reescrita para index.php
```

---

## ⚙️ PARTE 3 — Gerar o backend CodeIgniter 4

```cmd
cd C:\Users\User\jb-multi-php
composer create-project codeigniter4/appstarter backend-tmp
xcopy /E /Y /I backend backend-tmp
rmdir /S /Q backend
ren backend-tmp backend
cd backend
copy env .env
```

Edite `backend\.env` e ajuste (já vem preenchido no `env`):

```env
CI_ENVIRONMENT = production
app.baseURL = 'https://jbmultimarcaas.com.br/api/'
app.indexPage = ''
app.forceGlobalSecureRequests = true

app.sessionCookieName = 'jb_session'
cookie.secure = true
cookie.samesite = 'Lax'

app.corsAllowedOrigins = 'https://jbmultimarcaas.com.br,https://www.jbmultimarcaas.com.br'

database.default.hostname = localhost
database.default.database = jbmultimarcaas2_jbmulti
database.default.username = jbmultimarcaas2_jbadmin
database.default.password = Vodin4s@
database.default.DBDriver = MySQLi
```

---

## 🎨 PARTE 4 — Buildar o frontend

```cmd
cd C:\Users\User\jb-multi-php
npm install
npm run build
```

`.env.production` já contém `VITE_API_URL="https://jbmultimarcaas.com.br/api"`.

---

## 🔗 PARTE 5 — Adaptar o `index.php` do CodeIgniter

Copie `backend\public\index.php` para `backend\public\index-prod.php` e
troque para apontar ao `ci/` (fora do `public_html`):

```php
<?php
// Bridge do CI 4 rodando em public_html/api/
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);

$pathsPath = realpath(FCPATH . '../../ci/app/Config/Paths.php');
require $pathsPath;

$paths = new Config\Paths();
require realpath($paths->systemDirectory . '/Boot.php')
    ?: $paths->systemDirectory . '/Boot.php';

exit(CodeIgniter\Boot::bootWeb($paths));
```

> Alternativa mais limpa: criar subdomínio `api.jbmultimarcaas.com.br`
> apontando para `ci/public/` e usar o `index.php` original sem mexer.

---

## 📤 PARTE 6 — Upload via FileZilla

### 6.1. `ci/` para `/home/jbmultimarcaas2/ci/`
Envie tudo de `backend\` **EXCETO** a pasta `public\`.

### 6.2. Frontend para `public_html/`
1. Envie tudo de `dist\`
2. Crie `public_html/api/` e envie:
   - `backend\public\index-prod.php` renomeado para `index.php`
   - `backend\public\.htaccess`
3. Crie `public_html/uploads/cars/` vazia

---

## 🗃️ PARTE 7 — Criar as tabelas

**Opção A — SSH:**
```cmd
ssh jbmultimarcaas2@jbmultimarcaas.com.br
cd ci
php spark migrate
php spark db:seed AdminSeeder
```

**Opção B — phpMyAdmin:** importe `backend\schema.sql`.

---

## 🔐 PARTE 8 — Permissões

Botão direito no FileZilla → **Permissões de arquivo** → `775` +
**Recorrer aos subdiretórios** em:

- `ci/writable/`
- `public_html/uploads/`

---

## ✅ PARTE 9 — Testar

| URL | Deve mostrar |
|---|---|
| `https://jbmultimarcaas.com.br` | Site JB Multimarcas |
| `https://jbmultimarcaas.com.br/api/cars` | `[]` (JSON vazio) |
| `https://jbmultimarcaas.com.br/auth` | Tela de login |

Login: `admin@jbmultimarcas.com.br` / `admin123`.

---

## 🆘 Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| **500 no /api** | Permissões / `.env` | `chmod 775 ci/writable`, conferir DB |
| **/api/cars retorna HTML** | `.htaccess` não subiu | Reenviar e ativar mod_rewrite |
| **CORS bloqueado** | Origem faltando | Ajustar `app.corsAllowedOrigins` no `.env` |
| **Login OK mas /admin volta pro login** | Cookie não persiste | HTTPS ativo + `cookie.secure=true` + `samesite='Lax'` |
| **"Session driver not found"** | `ci/writable/session/` sem permissão | `chmod 775` recursivo em `ci/writable` |
| **Erro MySQL** | Falta prefixo | Usar `jbmultimarcaas2_jbmulti` / `jbmultimarcaas2_jbadmin` |

---

## 📌 Checklist final

- [ ] Banco criado no cPanel
- [ ] `backend\.env` correto
- [ ] `composer create-project` rodado e mesclado
- [ ] `npm run build` gerou `dist/`
- [ ] `ci/` fora do `public_html`
- [ ] `dist/` + `api/index.php` + `.htaccess` em `public_html`
- [ ] Migrations rodadas
- [ ] Permissões 775 em `ci/writable` e `uploads`
- [ ] `/api/cars` responde `[]`
- [ ] Login admin funciona
- [ ] Senha do admin trocada