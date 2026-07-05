# JB Multimarcas — Backend (CodeIgniter 4)

API REST em **CodeIgniter 4** com autenticação por **sessão simples**,
CRUD de veículos e upload local de imagens. Compatível com **Locaweb Go
/ cPanel** (PHP 8.1+ / MySQL).

> Este diretório contém **apenas os arquivos específicos da aplicação**.
> O esqueleto do CodeIgniter 4 é gerado com Composer e mesclado por cima.

---

## 1. Gerar o projeto localmente (uma vez)

Abra o CMD na pasta do repositório:

```cmd
cd C:\Projetos\jb-multimarcas
composer create-project codeigniter4/appstarter backend-tmp

xcopy /E /Y /I backend backend-tmp
rmdir /S /Q backend
ren backend-tmp backend

cd backend
copy env .env
```

No Linux/Mac substitua `xcopy` por `cp -r backend/. backend-tmp/`.

---

## 2. Configurar `.env`

Edite `backend/.env`:

```ini
CI_ENVIRONMENT = production

app.baseURL = 'https://jbmultimarcaas.com.br/'
app.indexPage = ''
app.forceGlobalSecureRequests = true

# Cookies de sessão em HTTPS
app.sessionCookieName = jb_session
cookie.secure = true
cookie.samesite = 'Lax'

database.default.hostname = localhost
database.default.database = jbmultimarcaas2_jbmulti
database.default.username = jbmultimarcaas2_jbadmin
database.default.password = Vodin4s@
database.default.DBDriver  = MySQLi
database.default.DBPrefix  =
database.default.port      = 3306
database.default.charset   = utf8mb4
database.default.DBCollat  = utf8mb4_unicode_ci

# Origens permitidas (CORS) — separadas por vírgula
app.corsAllowedOrigins = 'https://jbmultimarcaas.com.br,https://www.jbmultimarcaas.com.br'

# Admin criado pelo seeder
app.adminEmail    = 'admin@jbmultimarcas.com.br'
app.adminPassword = 'admin123'
```

> Em desenvolvimento local troque `cookie.secure = false`,
> `forceGlobalSecureRequests = false` e adicione `http://localhost:8080` em
> `corsAllowedOrigins`.

---

## 3. Criar as tabelas

**Opção A — Migrations (local com CLI):**

```cmd
php spark migrate
php spark db:seed AdminSeeder
```

**Opção B — phpMyAdmin (Locaweb):**
Importe o arquivo `backend/schema.sql` no banco. Ele cria as tabelas e o
admin padrão.

---

## 4. Rodar em dev

```cmd
php spark serve
```

API em `http://localhost:8080` (mude a porta se conflitar).
No frontend, `VITE_API_URL="http://localhost:8080/api"`.

---

## 5. Endpoints

Todas as rotas ficam sob `/api`. Autenticação por **cookie de sessão**
(o navegador envia automaticamente com `credentials: 'include'`).

### Autenticação

| Método | Rota              | Auth      | Descrição |
|--------|-------------------|-----------|-----------|
| POST   | `/api/auth/login` | público   | body: `{email,password}` → `{user}` |
| POST   | `/api/auth/logout`| sessão    | encerra sessão |
| GET    | `/api/auth/me`    | sessão    | retorna usuário logado |

### Veículos

| Método | Rota                | Auth       | Descrição |
|--------|---------------------|------------|-----------|
| GET    | `/api/cars`         | público    | lista |
| GET    | `/api/cars/{id}`    | público    | detalhe |
| POST   | `/api/cars`         | admin      | cria |
| PUT    | `/api/cars/{id}`    | admin      | atualiza |
| DELETE | `/api/cars/{id}`    | admin      | remove |
| POST   | `/api/uploads/car`  | admin      | multipart `file` → `{url}` |

## 6. Deploy na Locaweb

Veja o guia completo em `../DEPLOY-LOCAWEB.md`.