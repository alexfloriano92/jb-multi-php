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
    const url = await uploadFile(file);
    form.image_url = url;
    renderUploader();
  } catch (e) { showFormErr(e.message); }
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