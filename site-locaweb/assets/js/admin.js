// ================================================================
// JB Multimarcas — Admin (login + CRUD de carros)
// Cookies de sessão viajam automaticamente por ser mesmo domínio.
// ================================================================
const API = "/api";

let CARS = [];
let editingId = null;
let form = defaults();

function defaults() {
  return {
    brand: "", model: "", year: new Date().getFullYear(), km: 0, price: null,
    color: "", fuel: "Flex", transmission: "Automático", category: "seminovo",
    image_url: "", images: [], description: "", sold: false, featured: false, sort_order: 0,
  };
}

async function api(path, opts = {}) {
  const { body, raw = false, headers, ...rest } = opts;
  const h = new Headers(headers);
  if (!raw && body !== undefined) h.set("Content-Type", "application/json");
  h.set("Accept", "application/json");
  const res = await fetch(`${API}${path}`, {
    ...rest, credentials: "include", headers: h,
    body: raw ? body : (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) throw new Error((data && (data.message || data.error)) || res.statusText || "Erro");
  return data;
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", async () => {
  // Login form
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);

  // Try auth
  try {
    const u = await api("/auth/me");
    if (u && u.role === "admin") {
      openPanel(u);
    } else if (u) {
      alert("Usuário sem permissão de administrador.");
      await api("/auth/logout", { method: "POST" }).catch(() => {});
    }
  } catch { /* fica no login */ }
});

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPass").value;
  const btn = document.getElementById("loginBtn");
  const err = document.getElementById("loginErr");
  err.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Autenticando...";
  try {
    const { user } = await api("/auth/login", { method: "POST", body: { email, password } });
    if (user.role !== "admin") throw new Error("Usuário sem permissão de administrador.");
    openPanel(user);
  } catch (ex) {
    err.textContent = ex.message || "Erro ao autenticar";
    err.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar no Painel";
  }
}

async function handleLogout() {
  await api("/auth/logout", { method: "POST" }).catch(() => {});
  location.reload();
}

async function openPanel(user) {
  document.getElementById("loginView").style.display = "none";
  document.getElementById("panelView").style.display = "block";
  document.getElementById("userEmail").textContent = user.email;
  wireForm();
  await reloadCars();
}

// ---------- Form ----------
function wireForm() {
  const up = document.getElementById("uploader");
  const fi = document.getElementById("fileInput");
  up.addEventListener("click", () => fi.click());
  fi.addEventListener("change", async () => {
    const f = fi.files?.[0]; if (!f) return;
    await uploadCover(f);
    fi.value = "";
  });
  document.getElementById("removeCover").addEventListener("click", () => {
    form.image_url = ""; renderUploader();
  });

  const gb = document.getElementById("galBtn");
  const gi = document.getElementById("galInput");
  gb.addEventListener("click", () => gi.click());
  gi.addEventListener("change", async () => {
    if (!gi.files?.length) return;
    gb.textContent = "Enviando...";
    try {
      for (const f of Array.from(gi.files)) {
        const url = await uploadFile(f);
        form.images.push(url);
      }
      renderGallery();
    } catch (e) { showFormErr(e.message); }
    finally { gb.textContent = "+ Adicionar fotos"; gi.value = ""; }
  });

  document.getElementById("carForm").addEventListener("submit", saveCar);
  document.getElementById("cancelBtn").addEventListener("click", resetForm);
  syncFormInputs();
  wireWhatsappImport();
}

function syncFormInputs() {
  document.getElementById("fBrand").value = form.brand || "";
  document.getElementById("fModel").value = form.model || "";
  document.getElementById("fYear").value = form.year || "";
  document.getElementById("fKm").value = form.km ?? 0;
  document.getElementById("fPrice").value = form.price ?? "";
  document.getElementById("fColor").value = form.color || "";
  document.getElementById("fFuel").value = form.fuel || "Flex";
  document.getElementById("fTrans").value = form.transmission || "Automático";
  document.getElementById("fCat").value = form.category || "seminovo";
  document.getElementById("fDesc").value = form.description || "";
  document.getElementById("fOrder").value = form.sort_order ?? 0;
  document.getElementById("fFeatured").checked = !!form.featured;
  document.getElementById("fSold").checked = !!form.sold;
  renderUploader();
  renderGallery();
}

function collectForm() {
  return {
    brand: document.getElementById("fBrand").value.trim(),
    model: document.getElementById("fModel").value.trim(),
    year: Number(document.getElementById("fYear").value) || new Date().getFullYear(),
    km: Number(document.getElementById("fKm").value) || 0,
    price: document.getElementById("fPrice").value ? Number(document.getElementById("fPrice").value) : null,
    color: document.getElementById("fColor").value || null,
    fuel: document.getElementById("fFuel").value || null,
    transmission: document.getElementById("fTrans").value || null,
    category: document.getElementById("fCat").value || "seminovo",
    image_url: form.image_url || null,
    images: form.images || [],
    description: document.getElementById("fDesc").value || null,
    sold: document.getElementById("fSold").checked,
    featured: document.getElementById("fFeatured").checked,
    sort_order: Number(document.getElementById("fOrder").value) || 0,
  };
}

function renderUploader() {
  const up = document.getElementById("uploader");
  const rm = document.getElementById("removeCover");
  if (form.image_url) {
    up.classList.add("has-img");
    up.innerHTML = `<img src="${form.image_url}" alt="Prévia" /><div style="margin-top:8px;font-size:12px;color:var(--muted)">Clique para trocar a imagem</div>`;
    rm.style.display = "block";
  } else {
    up.classList.remove("has-img");
    up.innerHTML = `<i class="fas fa-cloud-upload-alt" style="font-size:32px;color:var(--gold);margin-bottom:8px"></i><div style="font-size:14px;font-weight:600">Clique para enviar uma foto</div><div style="font-size:12px;color:#6b7280;margin-top:4px">JPG, PNG ou WEBP</div>`;
    rm.style.display = "none";
  }
}

function renderGallery() {
  const grid = document.getElementById("galGrid");
  document.getElementById("galCount").textContent = form.images.length;
  if (!form.images.length) { grid.style.display = "none"; grid.innerHTML = ""; return; }
  grid.style.display = "grid";
  grid.innerHTML = form.images.map((url, i) => `
    <div class="gal-thumb"><img src="${url}" alt="" /><button type="button" data-i="${i}" title="Remover">×</button></div>
  `).join("");
  grid.querySelectorAll("button[data-i]").forEach((b) =>
    b.addEventListener("click", () => { form.images.splice(Number(b.dataset.i), 1); renderGallery(); })
  );
}

async function uploadCover(file) {
  try {
    const up = document.getElementById("uploader");
    up.classList.remove("has-img");
    up.innerHTML = `<div style="color:var(--gold);font-size:14px"><i class="fas fa-spinner fa-spin" style="margin-right:8px"></i>Enviando ${escapeHtml(file.name)}...</div>`;
    const url = await uploadFile(file);
    form.image_url = url;
    renderUploader();
  } catch (e) {
    console.error("Upload falhou:", e);
    showFormErr("Upload falhou: " + (e.message || e));
    renderUploader();
  }
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await api("/uploads/car", { method: "POST", body: fd, raw: true });
  return r.url;
}

function showFormErr(msg) {
  const e = document.getElementById("formErr");
  e.textContent = msg; e.style.display = "block";
  setTimeout(() => (e.style.display = "none"), 5000);
}

async function saveCar(e) {
  e.preventDefault();
  const btn = document.getElementById("saveBtn");
  btn.disabled = true; btn.textContent = "Salvando...";
  try {
    const payload = collectForm();
    if (!payload.brand || !payload.model) throw new Error("Marca e modelo são obrigatórios.");
    if (editingId) await api(`/cars/${editingId}`, { method: "PUT", body: payload });
    else await api("/cars", { method: "POST", body: payload });
    resetForm();
    await reloadCars();
  } catch (ex) { showFormErr(ex.message); }
  finally { btn.disabled = false; btn.textContent = editingId ? "Salvar alterações" : "Adicionar veículo"; }
}

function resetForm() {
  form = defaults();
  editingId = null;
  document.getElementById("formTitle").textContent = "Novo veículo";
  document.getElementById("saveBtn").textContent = "Adicionar veículo";
  document.getElementById("cancelBtn").style.display = "none";
  document.getElementById("fileInput").value = "";
  syncFormInputs();
}

// ---------- Lista ----------
async function reloadCars() {
  try {
    CARS = await api("/cars");
  } catch (e) { CARS = []; }
  document.getElementById("carsCount").textContent = CARS.length;
  const list = document.getElementById("carsList");
  if (!CARS.length) { list.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">Nenhum veículo cadastrado.</div>`; return; }
  list.innerHTML = CARS.map((c) => `
    <div class="car-row${c.sold ? " sold" : ""}">
      <div class="car-thumb">${c.image_url ? `<img src="${c.image_url}" alt="" />` : `<i class="fas fa-car" style="color:#333;font-size:24px"></i>`}</div>
      <div>
        <div class="car-info">${escapeHtml(c.brand)} ${escapeHtml(c.model)} <span>· ${c.year}</span></div>
        <div class="car-meta">
          ${Number(c.km).toLocaleString("pt-BR")} km · ${escapeHtml(c.category)} ${c.price ? `· R$ ${Number(c.price).toLocaleString("pt-BR")}` : ""}
          ${c.featured ? `<span class="badge-star">★ destaque</span>` : ""}
          ${c.sold ? `<span class="badge-sold">vendido</span>` : ""}
        </div>
      </div>
      <div class="car-actions">
        <button class="btn-s ${c.featured ? "btn-gold" : "btn-dark"}" data-act="feat" data-id="${c.id}">★</button>
        <button class="btn-s ${c.sold ? "btn-red" : "btn-dark"}" data-act="sold" data-id="${c.id}">${c.sold ? "Reativar" : "Vendido"}</button>
        <button class="btn-s btn-dark" data-act="edit" data-id="${c.id}">Editar</button>
        <button class="btn-s btn-danger" data-act="del" data-id="${c.id}">Excluir</button>
      </div>
    </div>
  `).join("");
  list.querySelectorAll("button[data-act]").forEach((b) => b.addEventListener("click", async () => {
    const c = CARS.find((x) => x.id === b.dataset.id); if (!c) return;
    const act = b.dataset.act;
    try {
      if (act === "feat") { await api(`/cars/${c.id}`, { method: "PUT", body: { featured: !c.featured } }); await reloadCars(); }
      else if (act === "sold") { await api(`/cars/${c.id}`, { method: "PUT", body: { sold: !c.sold } }); await reloadCars(); }
      else if (act === "edit") {
        form = { ...defaults(), ...c, images: Array.isArray(c.images) ? c.images : (c.images ? JSON.parse(c.images) : []) };
        editingId = c.id;
        document.getElementById("formTitle").textContent = "Editar veículo";
        document.getElementById("saveBtn").textContent = "Salvar alterações";
        document.getElementById("cancelBtn").style.display = "inline-block";
        syncFormInputs();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (act === "del") {
        if (!confirm("Excluir este veículo?")) return;
        await api(`/cars/${c.id}`, { method: "DELETE" }); await reloadCars();
      }
    } catch (e) { alert(e.message); }
  }));
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// =====================================================================
// Importador de WhatsApp — 100% no navegador (grátis, sem API externa)
// =====================================================================
function wireWhatsappImport() {
  const btn    = document.getElementById("waImportBtn");
  const modal  = document.getElementById("waModal");
  const close  = document.getElementById("waClose");
  const drop   = document.getElementById("waDrop");
  const files  = document.getElementById("waFiles");
  const prev   = document.getElementById("waPreview");
  const apply  = document.getElementById("waApply");
  const errBox = document.getElementById("waErr");
  let pending = []; // File[]

  const open = () => { modal.style.display = "flex"; };
  const hide = () => { modal.style.display = "none"; document.getElementById("waText").value=""; pending=[]; prev.innerHTML=""; errBox.style.display="none"; };

  btn.addEventListener("click", open);
  close.addEventListener("click", hide);
  modal.addEventListener("click", (e) => { if (e.target === modal) hide(); });

  drop.addEventListener("click", () => files.click());
  ["dragenter","dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.style.borderColor = "var(--gold)"; }));
  ["dragleave","drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.style.borderColor = "var(--border)"; }));
  drop.addEventListener("drop", e => addFiles(e.dataTransfer.files));
  files.addEventListener("change", () => { addFiles(files.files); files.value = ""; });

  function addFiles(list) {
    for (const f of Array.from(list || [])) {
      if (!f.type.startsWith("image/")) continue;
      pending.push(f);
      const url = URL.createObjectURL(f);
      const div = document.createElement("div");
      div.style.cssText = "position:relative;aspect-ratio:1/1;border-radius:8px;overflow:hidden;background:var(--surface)";
      div.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover" />`;
      prev.appendChild(div);
    }
  }

  apply.addEventListener("click", async () => {
    errBox.style.display = "none";
    const text = document.getElementById("waText").value.trim();
    if (!text && !pending.length) { errBox.textContent = "Cole a mensagem ou adicione fotos."; errBox.style.display="block"; return; }

    // 1) parse do texto
    if (text) {
      const p = parseWhatsappVehicle(text);
      Object.assign(form, p);
      syncFormInputs();
    }

    // 2) upload das fotos (a 1ª vira capa se não houver)
    if (pending.length) {
      apply.disabled = true; apply.textContent = "Enviando fotos...";
      try {
        for (let i = 0; i < pending.length; i++) {
          const url = await uploadFile(pending[i]);
          if (!form.image_url && i === 0) form.image_url = url;
          else form.images.push(url);
        }
        renderUploader(); renderGallery();
      } catch (e) {
        errBox.textContent = "Erro ao enviar foto: " + (e.message || e);
        errBox.style.display = "block";
        apply.disabled = false; apply.textContent = "Preencher formulário";
        return;
      }
      apply.disabled = false; apply.textContent = "Preencher formulário";
    }

    hide();
  });
}

// Parser puro-JS. Reconhece formatos livres típicos de WhatsApp em PT-BR.
function parseWhatsappVehicle(raw) {
  const out = {};
  const t = " " + raw.replace(/\s+/g, " ").trim() + " ";
  const low = t.toLowerCase();

  // Ano (1980-2099) — prioriza "ano 2015" ou "2015/2016"
  let m = low.match(/ano[:\s]*((?:19|20)\d{2})/) || low.match(/\b((?:19|20)\d{2})\s*\/\s*(?:19|20)\d{2}\b/) || low.match(/\b((?:19|20)\d{2})\b/);
  if (m) out.year = Number(m[1]);

  // KM
  // Aceita: "84.000 km", "84 mil km", "159mil rodados", "159 mil rodados", "km: 84000", "rodados: 84000"
  m = low.match(/([\d\.\,]+)\s*mil\s*(?:km|rodad|rod\b)/)
   || low.match(/([\d\.\,]+)\s*km\b/)
   || low.match(/(?:km|rodad(?:os|as)?|rodag[eé]m)[:\s]*([\d\.\,]+)/)
   || low.match(/([\d\.\,]+)\s*rodad/);
  if (m) {
    let n = Number(m[1].replace(/\./g,"").replace(",","."));
    // Se veio "xxx mil ..." ou "xxxmil ...", multiplica por 1000
    const raw1 = m[0];
    if (/mil/.test(raw1) && n < 1000) n *= 1000;
    if (!isNaN(n)) out.km = Math.round(n);
  }

  // Preço — aceita "R$ 37.500,00", "Valor: 37.500,00", "Preço 37500", "por 37.500"
  m = t.match(/R\$\s*([\d\.\,]+)/i)
   || low.match(/(?:pre[çc]o|valor|pe[çc]o|por)[:\s]*(?:r\$\s*)?([\d\.\,]+)/);
  if (m) {
    const n = Number(m[1].replace(/\./g,"").replace(",","."));
    if (!isNaN(n)) out.price = n;
  }

  // Câmbio
  if (/\bautom[aá]tic|\bcvt\b|\bautomatizad/i.test(t)) out.transmission = /\bcvt\b/i.test(t) ? "CVT" : (/automatizad/i.test(t) ? "Automatizado" : "Automático");
  else if (/\bmanual\b/i.test(t)) out.transmission = "Manual";

  // Combustível — Flex tem prioridade sobre "elétrico" para evitar
  // falso-positivo em "vidros elétricos" / "trava elétrica".
  // Também ignoramos "elétrico(s/a)" quando aparece ao lado de vidro/trava/retrovisor/direção.
  const hasFlex     = /\bflex\b/i.test(t);
  const eletricoCtx = /(vidros?|travas?|retrovisor(?:es)?|dire[çc][aã]o|espelhos?)\s+el[eé]tric/i.test(t)
                   || /el[eé]tric(?:os|as)\b/i.test(t); // plural = quase sempre acessório
  if (hasFlex)                                     out.fuel = "Flex";
  else if (/\bh[íi]brid/i.test(t))                 out.fuel = "Híbrido";
  else if (/\bel[eé]tric/i.test(t) && !eletricoCtx) out.fuel = "Elétrico";
  else if (/\bdiesel\b/i.test(t))                  out.fuel = "Diesel";
  else if (/\betanol\b/i.test(t))                  out.fuel = "Etanol";
  else if (/\bgasolina\b/i.test(t))                out.fuel = "Gasolina";

  // Cor
  const cores = ["preto","preta","branco","branca","prata","cinza","vermelho","vermelha","azul","verde","amarelo","amarela","dourado","dourada","bege","marrom","bordô","bordo","grafite"];
  for (const c of cores) {
    const re = new RegExp("\\b"+c+"\\b","i");
    if (re.test(t)) { out.color = c.charAt(0).toUpperCase()+c.slice(1); break; }
  }

  // Marca / Modelo — 1ª palavra em MAIÚSCULA de uma lista comum
  const marcas = ["FIAT","VOLKSWAGEN","VW","CHEVROLET","GM","FORD","TOYOTA","HYUNDAI","HONDA","RENAULT","NISSAN","JEEP","PEUGEOT","CITROEN","CITROËN","MITSUBISHI","KIA","BMW","MERCEDES","AUDI","VOLVO","LAND","RAM","DODGE","SUZUKI","SMART","CAOA","CHERY","BYD","GWM","JAC"];
  const upper = raw.toUpperCase();
  let brand = null, brandIdx = -1;
  for (const b of marcas) {
    const idx = upper.indexOf(b);
    if (idx >= 0 && (brandIdx < 0 || idx < brandIdx)) { brand = b; brandIdx = idx; }
  }
  if (brand) {
    out.brand = brand === "VW" ? "Volkswagen" : (brand === "GM" ? "Chevrolet" : capitalize(brand));
    // Modelo = próximas 1-3 palavras após a marca, cortando em vírgula/traço/quebra
    const after = raw.slice(brandIdx + brand.length).replace(/^[\s\-:]+/, "");
    const stop = after.search(/[,\n\r\.\/]|\bano\b|\d{4}/i);
    const chunk = (stop > 0 ? after.slice(0, stop) : after).trim().split(/\s+/).slice(0,4).join(" ");
    if (chunk) out.model = chunk;
  }

  // Telefones (só para referência — jogamos na descrição se tiver)
  const desc = raw.trim();
  if (desc) out.description = desc;

  return out;
}

function capitalize(s) {
  return s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
}