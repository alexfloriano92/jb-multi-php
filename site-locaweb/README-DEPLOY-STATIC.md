# 🚀 Deploy do site estático na Locaweb

Este guia é para a versão **HTML/CSS/JS puros** (pasta `site-locaweb/`)
que roda direto na sua hospedagem Locaweb, com o domínio
`jbmultimarcaas.com.br` — **sem redirecionamento e sem Lovable Pro**.

## Estrutura final na Locaweb

```
/home/jbmultimarcaas2/
├── ci/                        ← CodeIgniter (backend PHP)
│   ├── app/  system/  vendor/  writable/
│   └── .env
└── public_html/               ← o que o navegador vê
    ├── index.html             ← site (esta pasta site-locaweb/)
    ├── admin.html
    ├── .htaccess
    ├── assets/
    │   ├── css/style.css
    │   ├── js/app.js
    │   ├── js/admin.js
    │   └── images/…
    ├── uploads/cars/          ← fotos enviadas pelo painel
    └── api/
        ├── index.php          ← ponte para o CI
        └── .htaccess
```

---

## Passo a passo

### 1. Banco de dados (já feito)
Você já criou o banco `jbmultimarcaas2_jbmulti` com o usuário
`jbmultimarcaas2_jbadmin` (senha `Vodin4s@`) no cPanel.

### 2. Gere o backend PHP (uma vez só, no seu PC)

```cmd
cd C:\Projetos\jb-multimarcas
composer create-project codeigniter4/appstarter backend-tmp
xcopy /E /Y /I backend backend-tmp
rmdir /S /Q backend
ren backend-tmp backend
cd backend
copy env .env
```

### 3. Importe o banco
No **cPanel → phpMyAdmin**, selecione o banco `jbmultimarcaas2_jbmulti`
e importe o arquivo `backend/schema.sql`. Isso cria as tabelas + o admin
`admin@jbmultimarcas.com.br` com senha `admin123`.

### 4. Envie os arquivos via FileZilla

**Configuração da conexão:**
- Host: `ftp.jbmultimarcaas.com.br`
- Usuário: `jbmultimarcaas2`
- Senha: (a que você definiu na Locaweb)
- Porta: `21`

**Upload 4.1 — Backend (fica FORA de public_html):**
Envie tudo de `C:\Projetos\jb-multimarcas\backend\` **EXCETO a pasta
`public\`** para `/home/jbmultimarcaas2/ci/`.

**Upload 4.2 — Site estático:**
Envie **todo o conteúdo** de `C:\Projetos\jb-multimarcas\site-locaweb\`
para `/home/jbmultimarcaas2/public_html/`.

> ⚠️ Envie **o conteúdo da pasta**, não a pasta em si. Ao terminar,
> `public_html/index.html`, `public_html/admin.html`, `public_html/assets/`
> e `public_html/api/` devem existir.

**Upload 4.3 — pasta de uploads:**
Crie manualmente no FileZilla a pasta vazia:
`public_html/uploads/cars/`

### 5. Ajuste permissões (FileZilla)
Clique com botão direito na pasta → **Permissões de arquivo** → `775` +
**Recorrer aos subdiretórios**:
- `/home/jbmultimarcaas2/ci/writable/`
- `/home/jbmultimarcaas2/public_html/uploads/`

---

## 6. Teste

| URL | Deve mostrar |
|---|---|
| `https://jbmultimarcaas.com.br` | Site novo |
| `https://jbmultimarcaas.com.br/api/cars` | `[]` (JSON) |
| `https://jbmultimarcaas.com.br/admin.html` | Tela de login |

Login: `admin@jbmultimarcas.com.br` / `admin123` (troque depois!)

---

## 🆘 Problemas comuns

| Sintoma | Solução |
|---|---|
| Site aparece, mas catálogo vazio | Abra `/api/cars` e veja o erro. Provavelmente permissões de `ci/writable/` ou `.env` errado. |
| `/api/cars` mostra HTML de erro 500 | O `ci/` não subiu completo ou `.env` está errado. Confira senha do banco. |
| Admin não faz login | Confira que o `schema.sql` foi importado no banco correto. |
| Fotos não sobem no admin | Faltou permissão 775 em `public_html/uploads/`. |
| Site "quebrado" (sem estilo) | Assets não subiram. Confira que `public_html/assets/css/style.css` existe. |

---

## ✏️ Editando o site depois

O site é apenas HTML/CSS/JS. Pra editar:
1. Abra os arquivos em qualquer editor (Bloco de Notas, VS Code…)
2. Salve
3. Reenvie via FileZilla

**Textos da home:** editar `site-locaweb/index.html`
**Cores/visual:** editar `site-locaweb/assets/css/style.css`
**Comportamento:** editar `site-locaweb/assets/js/app.js`