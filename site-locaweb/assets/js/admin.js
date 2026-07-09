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
  wireAutoCategoria();
}

// -------------------------------------------------------------------
// Sugestão automática de Categoria com base em marca+modelo+descrição.
// Não sobrescreve se o usuário já escolheu manualmente.
// -------------------------------------------------------------------
function wireAutoCategoria() {
  const fCat   = document.getElementById("fCat");
  const fBrand = document.getElementById("fBrand");
  const fModel = document.getElementById("fModel");
  const fDesc  = document.getElementById("fDesc");
  if (!fCat) return;

  // Marca como "tocado pelo usuário" quando ele mudar manualmente.
  fCat.addEventListener("change", () => { fCat.dataset.userTouched = "1"; });

  const runSuggest = () => {
    if (fCat.dataset.userTouched === "1") return;
    const sugestao = detectCategoria(
      `${fBrand.value} ${fModel.value} ${fDesc.value}`
    );
    if (sugestao) fCat.value = sugestao;
  };
  ["input","change","blur"].forEach(ev => {
    fBrand.addEventListener(ev, runSuggest);
    fModel.addEventListener(ev, runSuggest);
    fDesc .addEventListener(ev, runSuggest);
  });
}

// Reseta o "toque manual" quando o formulário é limpo / carregado.
function resetCatTouched() {
  const fCat = document.getElementById("fCat");
  if (fCat) delete fCat.dataset.userTouched;
}

// Dicionário Marca+Modelo → categoria (words minúsculas, sem acento).
// A ordem NÃO importa; usamos matching por palavra-chave.
const CAT_KEYWORDS = {
  moto: [
    "moto","motocicleta","cb ","cbr","xre","bros","fazer","factor","titan","fan",
    "biz","pop","cg ","xj6","mt-03","mt-07","mt-09","z400","z900","ninja","hornet",
    "yamaha","harley","triumph","kawasaki","ducati","bmw motorrad","dafra","shineray"
  ],
  caminhao: [
    "caminhao","caminhão","truck","bitruck","cavalo mecanico","volvo fh","volvo fm",
    "scania r","scania s","mercedes atego","mercedes axor","mercedes actros",
    "constellation","cargo 815","cargo 816","cargo 1723","daf xf","iveco tector",
    "iveco stralis","vw delivery"
  ],
  pickup: [
    "toro","hilux","ranger","s10","s-10","frontier","amarok","l200","triton","dakota",
    "gladiator","maverick","f-250","f250","strada","saveiro","montana","oroch","rampage",
    "courier","hoggar","ram 1500","ram 2500","ram 3500","ram rampage","picape","pickup"
  ],
  suv: [
    "compass","renegade","commander","tracker","trailblazer","equinox","captur","kicks",
    "duster","territory","bronco","ecosport","edge","rav4","corolla cross","sw4","kuga",
    "creta","tucson","santa fe","hr-v","hrv","wr-v","wrv","cr-v","crv","pilot","pajero",
    "outlander","asx","eclipse cross","tiggo","haval","song","song plus","song pro",
    "xc40","xc60","xc90","q3","q5","q7","q8","x1","x3","x5","x6","glc","gle","gla",
    "range rover","evoque","discovery","defender","tiguan","taos","t-cross","tcross",
    "nivus","polo track","fastback","pulse","2008","3008","5008","c4 cactus","aircross"
  ],
  hatch: [
    "onix","onix hatch","gol","up","polo","fox","fit","city hatch","yaris hatch",
    "argo","mobi","palio","uno","ka ","ka hatch","fiesta","march","sandero","stepway",
    "clio","206","207","208","c3","picanto","i30","hb20","hb20s","hb20 hatch","celta",
    "corsa hatch","fusca","brasilia","gol g"
  ],
  sedan: [
    "corolla","civic","city sedan","yaris sedan","hb20s","voyage","siena","grand siena",
    "cronos","logan","versa","sentra","altima","accord","jetta","virtus","polo sedan",
    "cerato","elantra","sonata","mazda 3","mazda 6","cruze","cobalt","prisma","fluence",
    "focus sedan","fusion","c4 pallas","c-class","classe c","classe e","classe s",
    "serie 3","serie 5","a3 sedan","a4","a6","a8"
  ],
  minivan: [
    "spin","livina","picasso","xsara picasso","touran","sharan","zafira","meriva",
    "carnival","sedona","idea","doblo","kangoo","partner","berlingo","caddy",
    "grand c4"
  ],
  utilitario: [
    "fiorino","kombi","express","doblo cargo","kangoo express","partner furgao",
    "berlingo furgao","master","ducato","daily","sprinter","jumper","boxer","hr ",
    "trafic","transit","expert","jumpy","scudo"
  ],
  cupe: [
    "camaro","mustang","challenger","supra","gt-r","gtr","370z","350z","rx-8","rx8",
    "veloster","tt ","cerato koup","brz","gt86","gr86","tiburon"
  ],
  conversivel: [
    "conversivel","conversível","cabriolet","cabrio","spider","roadster","boxster",
    "z4","slk","sl "
  ],
  perua: [
    "perua","station wagon","fielder","parati","quantum","astra sw","palio weekend",
    "a4 avant","a6 avant","touring"
  ],
  eletrico: [
    "leaf","kona eletrico","e-208","e208","zoe","bolt ev","mustang mach-e","mach-e",
    "id.4","id4","id.3","id3","taycan","model 3","model s","model x","model y",
    "byd dolphin","dolphin","byd yuan","yuan plus","seal","han ev","song plus ev",
    "eqa","eqb","eqc","eqe","eqs","i3","i4","i7","ix","ix3","etron","e-tron"
  ],
  hibrido: [
    "hibrido","híbrido","hybrid","prius","corolla hybrid","corolla cross hybrid",
    "rav4 hybrid","niro hybrid","ioniq hybrid","c-hr hybrid","song plus dm-i",
    "haval h6 hev","commander hybrid","compass hybrid"
  ],
};

function _normalizaTexto(s) {
  return " " + (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim() + " ";
}

function detectCategoria(texto) {
  const t = _normalizaTexto(texto);
  if (!t.trim()) return null;

  // Precedência: elétrico/híbrido/moto/caminhão vencem antes de body-style.
  const ordem = ["eletrico","hibrido","moto","caminhao","pickup","suv","minivan","utilitario","cupe","conversivel","perua","hatch","sedan"];
  for (const cat of ordem) {
    for (const kw of CAT_KEYWORDS[cat]) {
      const k = " " + kw.toLowerCase().replace(/\s+/g," ") + " ";
      if (t.includes(k)) return cat;
      // também tenta como palavra "colada" no fim (ex: "onix" cercado por vírgula/newline)
      const re = new RegExp("(^|\\W)" + kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "(\\W|$)","i");
      if (re.test(t)) return cat;
    }
  }
  return null;
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
    <div class="gal-thumb" draggable="true" data-i="${i}" title="Arraste para reordenar" style="cursor:grab;position:relative">
      <img src="${url}" alt="" draggable="false" style="pointer-events:none" />
      <span style="position:absolute;left:6px;top:6px;background:rgba(0,0,0,.65);color:#fff;font-size:11px;padding:2px 6px;border-radius:10px;font-weight:700">${i+1}</span>
      <button type="button" data-i="${i}" title="Remover">×</button>
    </div>
  `).join("");
  grid.querySelectorAll("button[data-i]").forEach((b) =>
    b.addEventListener("click", () => { form.images.splice(Number(b.dataset.i), 1); renderGallery(); })
  );
  // Drag & drop reorder
  let dragFrom = null;
  grid.querySelectorAll(".gal-thumb").forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      dragFrom = Number(el.dataset.i);
      el.style.opacity = ".4";
      try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(dragFrom)); } catch(_) {}
    });
    el.addEventListener("dragend", () => { el.style.opacity = ""; grid.querySelectorAll(".gal-thumb").forEach(t => t.style.outline = ""); });
    el.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; el.style.outline = "2px dashed var(--gold)"; });
    el.addEventListener("dragleave", () => { el.style.outline = ""; });
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      const to = Number(el.dataset.i);
      const from = dragFrom != null ? dragFrom : Number(e.dataTransfer.getData("text/plain"));
      if (Number.isNaN(from) || Number.isNaN(to) || from === to) return;
      const [moved] = form.images.splice(from, 1);
      form.images.splice(to, 0, moved);
      dragFrom = null;
      renderGallery();
    });
  });
}

async function uploadCover(file) {
  try {
    // Abre modal de recorte antes de enviar (aspect igual à exibição da capa)
    const blob = await cropImage(file, 3 / 2).catch(() => null);
    if (!blob) return; // cancelou
    const cropped = new File([blob], (file.name || "capa").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    const up = document.getElementById("uploader");
    up.classList.remove("has-img");
    up.innerHTML = `<div style="color:var(--gold);font-size:14px"><i class="fas fa-spinner fa-spin" style="margin-right:8px"></i>Enviando ${escapeHtml(cropped.name)}...</div>`;
    const url = await uploadFile(cropped);
    form.image_url = url;
    renderUploader();
  } catch (e) {
    console.error("Upload falhou:", e);
    showFormErr("Upload falhou: " + (e.message || e));
    renderUploader();
  }
}

// ---------- Recorte de imagem (capa) ----------
// Retorna um Blob JPEG recortado no aspect informado (largura/altura).
function cropImage(file, aspect) {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => openCropModal(img, src, aspect, resolve, reject);
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("Imagem inválida")); };
    img.src = src;
  });
}

function openCropModal(img, srcUrl, aspect, resolve, reject) {
  const cleanup = () => { document.body.removeChild(ov); URL.revokeObjectURL(srcUrl); };
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px";
  ov.innerHTML = `
    <div style="color:#fff;font-size:14px;margin-bottom:8px;font-weight:600">Recorte a capa (arraste para mover, use o canto para redimensionar)</div>
    <div id="cropStage" style="position:relative;max-width:90vw;max-height:70vh;background:#000;overflow:hidden;user-select:none;touch-action:none"></div>
    <div style="margin-top:14px;display:flex;gap:10px">
      <button type="button" id="cropCancel" style="padding:10px 18px;border:0;border-radius:8px;background:#333;color:#fff;font-weight:600;cursor:pointer">Cancelar</button>
      <button type="button" id="cropOk" style="padding:10px 18px;border:0;border-radius:8px;background:var(--gold,#ffc501);color:#000;font-weight:700;cursor:pointer">Recortar e enviar</button>
    </div>`;
  document.body.appendChild(ov);

  const stage = ov.querySelector("#cropStage");
  // Escala para caber
  const maxW = Math.min(window.innerWidth * 0.9, 900);
  const maxH = window.innerHeight * 0.7;
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
  const dispW = Math.round(img.naturalWidth * scale);
  const dispH = Math.round(img.naturalHeight * scale);
  stage.style.width = dispW + "px";
  stage.style.height = dispH + "px";
  stage.innerHTML = `<img src="${srcUrl}" style="width:100%;height:100%;display:block;pointer-events:none" draggable="false"/>`;

  // Caixa de recorte inicial (aspect fixo)
  let bw = Math.min(dispW, dispH * aspect) * 0.9;
  let bh = bw / aspect;
  if (bh > dispH) { bh = dispH * 0.9; bw = bh * aspect; }
  let bx = (dispW - bw) / 2, by = (dispH - bh) / 2;

  const box = document.createElement("div");
  box.style.cssText = "position:absolute;border:2px solid #ffc501;box-shadow:0 0 0 9999px rgba(0,0,0,.55);cursor:move";
  const handle = document.createElement("div");
  handle.style.cssText = "position:absolute;right:-8px;bottom:-8px;width:18px;height:18px;background:#ffc501;border:2px solid #000;border-radius:4px;cursor:nwse-resize";
  box.appendChild(handle);
  stage.appendChild(box);

  const apply = () => {
    bx = Math.max(0, Math.min(bx, dispW - bw));
    by = Math.max(0, Math.min(by, dispH - bh));
    box.style.left = bx + "px"; box.style.top = by + "px";
    box.style.width = bw + "px"; box.style.height = bh + "px";
  };
  apply();

  let mode = null, sx = 0, sy = 0, sbx = 0, sby = 0, sbw = 0, sbh = 0;
  const onDown = (e, m) => {
    e.preventDefault(); mode = m;
    const p = e.touches ? e.touches[0] : e;
    sx = p.clientX; sy = p.clientY; sbx = bx; sby = by; sbw = bw; sbh = bh;
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false }); document.addEventListener("touchend", onUp);
  };
  const onMove = (e) => {
    if (!mode) return; e.preventDefault();
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - sx, dy = p.clientY - sy;
    if (mode === "move") { bx = sbx + dx; by = sby + dy; }
    else {
      let nw = Math.max(40, sbw + dx);
      let nh = nw / aspect;
      if (sbx + nw > dispW) { nw = dispW - sbx; nh = nw / aspect; }
      if (sby + nh > dispH) { nh = dispH - sby; nw = nh * aspect; }
      bw = nw; bh = nh;
    }
    apply();
  };
  const onUp = () => {
    mode = null;
    document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp);
    document.removeEventListener("touchmove", onMove); document.removeEventListener("touchend", onUp);
  };
  box.addEventListener("mousedown", (e) => { if (e.target === handle) return; onDown(e, "move"); });
  box.addEventListener("touchstart", (e) => { if (e.target === handle) return; onDown(e, "move"); }, { passive: false });
  handle.addEventListener("mousedown", (e) => onDown(e, "resize"));
  handle.addEventListener("touchstart", (e) => onDown(e, "resize"), { passive: false });

  ov.querySelector("#cropCancel").addEventListener("click", () => { cleanup(); reject(new Error("cancelado")); });
  ov.querySelector("#cropOk").addEventListener("click", () => {
    const sc = 1 / scale;
    const sxN = Math.round(bx * sc), syN = Math.round(by * sc);
    const swN = Math.round(bw * sc), shN = Math.round(bh * sc);
    // Saída máx 1200px de largura
    const outW = Math.min(1200, swN);
    const outH = Math.round(outW / aspect);
    const cv = document.createElement("canvas");
    cv.width = outW; cv.height = outH;
    cv.getContext("2d").drawImage(img, sxN, syN, swN, shN, 0, 0, outW, outH);
    cv.toBlob((b) => { cleanup(); b ? resolve(b) : reject(new Error("Falha ao gerar imagem")); }, "image/jpeg", 0.9);
  });
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
  resetCatTouched();
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
        // Ao editar um carro já salvo, respeita a categoria existente.
        const fCatEl = document.getElementById("fCat");
        if (fCatEl) fCatEl.dataset.userTouched = "1";
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
        // 3) detecta a cor dominante analisando a 1ª foto e sobrescreve o campo Cor.
        try {
          const corDetectada = await detectColorFromImage(pending[0]);
          if (corDetectada) {
            form.color = corDetectada;
            const inp = document.getElementById("fColor");
            if (inp) inp.value = corDetectada;
          }
        } catch (_) { /* silencioso — mantém a cor vinda do texto */ }
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

  // Marca / Modelo — 1ª linha não vazia: 1ª palavra = marca, restante = modelo.
  // Ex.: "Chevrolet Cobalt 1.4 LT" → brand="Chevrolet", model="Cobalt 1.4 LT"
  const firstLine = raw.split(/\r?\n/).map(s => s.trim()).find(Boolean) || "";
  const clean = firstLine.replace(/^[\-\*\•\s]+/, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 1 && /^[A-Za-zÀ-ÿ]{2,}$/.test(parts[0])) {
    const aliases = { VW: "Volkswagen", GM: "Chevrolet" };
    const rawBrand = parts[0].toUpperCase();
    out.brand = aliases[rawBrand] || capitalize(parts[0]);
    if (parts.length > 1) out.model = parts.slice(1).join(" ");
  }

  // Telefones (só para referência — jogamos na descrição se tiver)
  const desc = raw.trim();
  if (desc) out.description = corrigirPortugues(desc);

  // Detecta categoria a partir de marca+modelo+descrição
  const catGuess = detectCategoria(`${out.brand || ""} ${out.model || ""} ${desc}`);
  if (catGuess) out.category = catGuess;

  return out;
}

function capitalize(s) {
  return s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
}

// -------------------------------------------------------------------
// Detecção de cor do veículo a partir da foto.
// Desenha a imagem em canvas 120x120, amostra a região central (onde
// tipicamente está a lataria), calcula a média ponderada de RGB e
// mapeia para a cor nomeada mais próxima da paleta automotiva.
// -------------------------------------------------------------------
async function detectColorFromImage(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const W = 120, H = 120;
    const cvs = document.createElement("canvas");
    cvs.width = W; cvs.height = H;
    const ctx = cvs.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    const data = ctx.getImageData(0, 0, W, H).data;

    // Amostra apenas a faixa central horizontal (25%–75% em X, 35%–70% em Y)
    // — evita céu no topo, chão no rodapé e bordas com fundo.
    const x0 = Math.floor(W * 0.25), x1 = Math.floor(W * 0.75);
    const y0 = Math.floor(H * 0.35), y1 = Math.floor(H * 0.70);
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * W + x) * 4;
        const R = data[i], G = data[i+1], B = data[i+2];
        // Descarta pixels quase pretos (sombra/pneu) e quase brancos (reflexo)
        const max = Math.max(R,G,B), min = Math.min(R,G,B);
        if (max < 20) continue;
        if (min > 240) continue;
        r += R; g += G; b += B; n++;
      }
    }
    if (!n) return null;
    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);

    return matchNamedColor(r, g, b);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Paleta de cores automotivas comuns (nome, R, G, B).
const CAR_PALETTE = [
  ["Preto",     20,  20,  22],
  ["Grafite",   55,  58,  62],
  ["Cinza",    120, 122, 125],
  ["Prata",    185, 188, 192],
  ["Branco",   235, 236, 238],
  ["Vermelho", 175,  30,  30],
  ["Bordô",    110,  22,  32],
  ["Vinho",     95,  25,  40],
  ["Laranja",  220, 110,  30],
  ["Amarelo",  225, 200,  40],
  ["Dourado",  180, 150,  70],
  ["Bege",     205, 185, 150],
  ["Marrom",   100,  60,  35],
  ["Verde",     35, 110,  55],
  ["Verde escuro", 25, 60, 40],
  ["Azul",      35,  70, 170],
  ["Azul escuro", 20, 35,  85],
  ["Azul claro", 120, 170, 210],
  ["Roxo",      95,  40, 130],
  ["Rosa",     220, 130, 160],
];

function matchNamedColor(r, g, b) {
  // Distância ponderada (olho humano é mais sensível ao verde).
  let best = null, bestD = Infinity;
  for (const [name, R, G, B] of CAR_PALETTE) {
    const dr = r - R, dg = g - G, db = b - B;
    const d = 0.30*dr*dr + 0.59*dg*dg + 0.11*db*db;
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

// -------------------------------------------------------------------
// Correção ortográfica leve (PT-BR) — sem API externa.
// Corrige acentuação e erros comuns segundo o Acordo Ortográfico vigente.
// -------------------------------------------------------------------
function corrigirPortugues(texto) {
  if (!texto) return texto;

  // Dicionário PT-BR (Acordo Ortográfico vigente).
  // Chave = forma sem acento / com erro comum; Valor = forma correta.
  const dic = {
    "veiculo":"veículo","veiculos":"veículos",
    "hidraulica":"hidráulica","hidraulico":"hidráulico",
    "eletrico":"elétrico","eletrica":"elétrica","eletricos":"elétricos","eletricas":"elétricas",
    "automatico":"automático","automatica":"automática","automaticos":"automáticos","automaticas":"automáticas",
    "cambio":"câmbio","cambios":"câmbios",
    "camera":"câmera","cameras":"câmeras",
    "camera de re":"câmera de ré","câmera de re":"câmera de ré",
    "ar condicionado":"ar-condicionado",
    "multimidia":"multimídia","midia":"mídia",
    "porta malas":"porta-malas","porta-malas":"porta-malas",
    "para choque":"para-choque","para-choque":"para-choque",
    "para brisa":"para-brisa","para-brisa":"para-brisa",
    "vidro eletrico":"vidro elétrico","vidros eletricos":"vidros elétricos",
    "trava eletrica":"trava elétrica","travas eletricas":"travas elétricas",
    "direçao":"direção","direcao":"direção",
    "direçao hidraulica":"direção hidráulica","direcao hidraulica":"direção hidráulica",
    "direçao eletrica":"direção elétrica","direcao eletrica":"direção elétrica",
    "transmissao":"transmissão","suspensao":"suspensão",
    "injeçao":"injeção","injecao":"injeção","ignicao":"ignição",
    "retrovisor eletrico":"retrovisor elétrico","retrovisores eletricos":"retrovisores elétricos",
    "farois":"faróis","farol de milha":"farol de milha",
    "liga leve":"liga leve","aluminio":"alumínio",
    "pneus novos":"pneus novos",
    "laudo cautelar":"laudo cautelar","laudo cautelar aprovado":"laudo cautelar aprovado",
    "unico dono":"único dono","unica dona":"única dona","segundo dono":"segundo dono",
    "revisao":"revisão","revisoes":"revisões","revisao em dia":"revisão em dia",
    "manutencao":"manutenção","manutencoes":"manutenções",
    "documentacao":"documentação","documentacao ok":"documentação ok",
    "ipva":"IPVA","ipva pago":"IPVA pago","ipva quitado":"IPVA quitado",
    "licenciamento":"licenciamento","licenciado":"licenciado",
    "transferencia":"transferência","procedencia":"procedência",
    "gasolina":"gasolina","etanol":"etanol","alcool":"álcool",
    "hibrido":"híbrido","hibrida":"híbrida","flex":"Flex","diesel":"Diesel",
    "sedan":"sedã","suv":"SUV","utilitario":"utilitário","utilitarios":"utilitários",
    "cupe":"cupê","conversivel":"conversível",
    "cinza chumbo":"cinza-chumbo","azul marinho":"azul-marinho","verde escuro":"verde-escuro",
    "bordo":"bordô",
    "kilometragem":"quilometragem","quilometragem":"quilometragem",
    "kilometros":"quilômetros","quilometros":"quilômetros",
    "otimo":"ótimo","otima":"ótima","otimos":"ótimos","otimas":"ótimas",
    "confortavel":"confortável","confortaveis":"confortáveis",
    "economico":"econômico","economica":"econômica","economicos":"econômicos","economicas":"econômicas",
    "impecavel":"impecável","impecaveis":"impecáveis",
    "nao":"não","tambem":"também","ja":"já","so":"só","porem":"porém",
    "voce":"você","voces":"vocês","atraves":"através",
    "esta":"está","estao":"estão","sao":"são","serao":"serão",
    "aceito troca":"aceito troca","aceitamos troca":"aceitamos troca",
    "financio":"financio","financiamento":"financiamento","financiado":"financiado",
    "parcelamos":"parcelamos","parcelado":"parcelado",
    "credito aprovado":"crédito aprovado","avaliacao":"avaliação",
    "duvida":"dúvida","duvidas":"dúvidas",
    "informacoes":"informações","informaçoes":"informações",
    "a venda":"à venda","à venda":"à venda",
  };

  let out = texto;

  // 1) Substituições — expressões longas primeiro (evita quebrar multi-palavra).
  const entries = Object.entries(dic).sort((a, b) => b[0].length - a[0].length);
  for (const [errado, certo] of entries) {
    const esc = errado.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // \b não funciona com acentos; usamos borda de caracteres alfanuméricos+acentuados.
    const re = new RegExp("(^|[^A-Za-zÀ-ÿ0-9])(" + esc + ")(?![A-Za-zÀ-ÿ0-9])", "gi");
    out = out.replace(re, (_m, pre, w) => pre + matchCase(w, certo));
  }

  // 2) Regras heurísticas de sufixo — corrigem palavras não listadas.
  //    "-cao"/"-çao" → "-ção"  |  "-coes"/"-çoes" → "-ções"
  out = out.replace(/([a-zà-ÿ])(ç|c)ao(?![a-zà-ÿ])/gi, (_m, p, c) => {
    const cc = c === "C" ? "Ç" : c === "c" ? "ç" : c;
    return p + cc + "ão";
  });
  out = out.replace(/([a-zà-ÿ])(ç|c)oes(?![a-zà-ÿ])/gi, (_m, p, c) => {
    const cc = c === "C" ? "Ç" : c === "c" ? "ç" : c;
    return p + cc + "ões";
  });

  // 3) Normaliza pontuação/espaços.
  out = out
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([;:!?])(?=\S)/g, "$1 ").replace(/([,.])(?=[^\s\d])/g, "$1 ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  // 4) Capitaliza início de frases.
  out = out.replace(/(^|[.!?]\s+|\n)([a-záéíóúâêôãõç])/g,
    (_, p, c) => p + c.toUpperCase());

  return out.trim();
}

function matchCase(original, replacement) {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}