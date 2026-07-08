// ================================================================
// JB Multimarcas — Home (vanilla JS)
// Consome a API PHP em /api (mesmo domínio → sem CORS, cookies OK)
// ================================================================

const API = "/api";
const SOCIOS = [
  { nome: "Júnior", fone: "5535999091119", inicial: "J", cor: "linear-gradient(135deg,#f4b942,#e8932a)" },
  { nome: "Bruno",  fone: "5535998854358", inicial: "B", cor: "linear-gradient(135deg,#7eb3ff,#5090e0)" },
];
const WHATS = SOCIOS[0].fone; // fallback (href válido)
const wa = (t) => `https://wa.me/${WHATS}?text=${encodeURIComponent(t)}`;
const fmtKm = (n) => (n || 0).toLocaleString("pt-BR");
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let CARS = [];
let currentBrand = "todas";
let currentCategory = "todos";

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", async () => {
  $("#year").textContent = new Date().getFullYear();
  $("#heroWhats").href = wa("Olá! Vim pelo site e gostaria de mais informações.");
  $("#floatWhats").href = wa("Olá! Vim pelo site da JB Multimarcas e gostaria de mais informações.");
  $("#noResultsWhats").href = wa("Olá! Estou buscando um veículo específico e gostaria de ajuda.");
  const showAllBtn = document.getElementById("catalogShowAll");
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      currentBrand = "todas";
      currentCategory = "todos";
      const si = $("#searchInput"); if (si) si.value = "";
      const sc = $("#searchClear"); if (sc) sc.style.display = "none";
      $("#suggestions")?.classList.remove("open");
      $$(".filter-btn").forEach((b) => b.classList.toggle("active", b.dataset.cat === "todos"));
      renderBrandPills();
      applyFilters();
      document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  wireNavbar();
  wireContactForm();
  wireFilters();
  wireSearch();
  wireOpenStatus();
  wireWhatsChooser();

  try {
    const res = await fetch(`${API}/cars`);
    CARS = await res.json();
  } catch (e) {
    console.warn("Falha ao carregar carros:", e);
    CARS = [];
  }
  renderBrandPills();
  renderCars();
  renderInterestOptions();
  observeFadeIn();
});

// ---------- Navbar ----------
function wireNavbar() {
  const nav = $("#navbar");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 60);
  window.addEventListener("scroll", onScroll);
  onScroll();

  const ham = $("#navHamburger");
  const menu = $("#mobileMenu");
  ham.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    ham.classList.toggle("active", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  $$("#mobileMenu a").forEach((a) =>
    a.addEventListener("click", () => {
      menu.classList.remove("open");
      ham.classList.remove("active");
      document.body.style.overflow = "";
    })
  );
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && menu.classList.contains("open")) {
      menu.classList.remove("open");
      ham.classList.remove("active");
      document.body.style.overflow = "";
    }
  });
}

// ---------- Renderização de carros ----------
function badgeFor(cat) {
  return cat.includes("novo") && !cat.includes("seminovo")
    ? { cls: "badge-novo", label: "0KM" }
    : { cls: "badge-seminovo", label: "Seminovo" };
}

function renderBrandPills() {
  const brands = Array.from(new Set(CARS.map((c) => (c.brand || "").toLowerCase()))).filter(Boolean);
  const items = [{ brand: "todas", label: "Todas as Marcas", icon: "fa-th" }].concat(
    brands.map((b) => ({ brand: b, label: b.charAt(0).toUpperCase() + b.slice(1), icon: "fa-car" }))
  );
  const html = items
    .map(
      (it) =>
        `<button class="brand-pill${currentBrand === it.brand ? " active" : ""}" data-brand="${it.brand}"><i class="fas ${it.icon}"></i> ${it.label}</button>`
    )
    .join("");
  $("#brandPills").innerHTML = html;
  $$("#brandPills .brand-pill").forEach((btn) =>
    btn.addEventListener("click", () => {
      currentBrand = btn.dataset.brand;
      $("#searchInput").value = "";
      $("#searchClear").style.display = "none";
      $("#suggestions").classList.remove("open");
      renderBrandPills();
      applyFilters();
    })
  );
}

function renderCars() {
  const grid = $("#vehiclesGrid");
  // limpa mantendo o noResults
  $$("#vehiclesGrid .vehicle-card").forEach((el) => el.remove());

  const list = CARS.filter((c) => !c.sold);
  list.forEach((c) => {
    const b = badgeFor(c.category || "");
    const yearLine = (c.category || "").includes("novo") && !(c.category || "").includes("seminovo")
      ? `${c.year} · 0 km · Novo`
      : `${c.year} · ${fmtKm(c.km)} km`;

    const el = document.createElement("div");
    el.className = "vehicle-card fade-in-up";
    el.dataset.category = c.category || "";
    el.dataset.brand = (c.brand || "").toLowerCase();
    el.dataset.model = (c.model || "").toLowerCase();
    el.style.cursor = "pointer";
    el.innerHTML = `
      <div class="vehicle-card-image">
        ${
          c.image_url
            ? `<img src="${escapeAttr(c.image_url)}" alt="${escapeAttr(c.brand + " " + c.model + " " + c.year)}" loading="lazy" />`
            : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#0a0a18,#141426);display:flex;align-items:center;justify-content:center"><i class="fas fa-car" style="font-size:80px;color:rgba(255,197,1,0.2)"></i></div>`
        }
        <span class="vehicle-badge ${b.cls}">${b.label}</span>
      </div>
      <div class="vehicle-card-content">
        <div class="vehicle-brand">${escapeHtml(c.brand)}</div>
        <div class="vehicle-name">${escapeHtml(c.model)}</div>
        <div class="vehicle-year">${yearLine}</div>
        <div class="vehicle-specs">
          ${c.fuel ? `<span class="vehicle-spec"><i class="fas fa-gas-pump"></i> ${escapeHtml(c.fuel)}</span>` : ""}
          ${c.transmission ? `<span class="vehicle-spec"><i class="fas fa-cog"></i> ${escapeHtml(c.transmission)}</span>` : ""}
          ${c.color ? `<span class="vehicle-spec"><i class="fas fa-palette"></i> ${escapeHtml(c.color)}</span>` : ""}
        </div>
        <div class="vehicle-card-footer">
          <a href="${wa(`Olá! Tenho interesse no ${c.brand} ${c.model} ${c.year}.`)}" target="_blank" rel="noreferrer" class="vehicle-btn" data-noopen>
            <i class="fab fa-whatsapp"></i> Tenho Interesse
          </a>
        </div>
      </div>
    `;
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-noopen]")) return;
      openCarModal(c);
    });
    grid.appendChild(el);
  });
  applyFilters();
}

function renderInterestOptions() {
  const sel = $("#c-int");
  const opts = CARS.filter((c) => !c.sold).map(
    (c) => `<option>${escapeHtml(c.brand)} ${escapeHtml(c.model)} ${c.year}</option>`
  );
  sel.innerHTML =
    `<option value="">Selecione ou descreva...</option>` +
    opts.join("") +
    `<option>Outro / Não tenho preferência</option>`;
}

// ---------- Filtros ----------
function wireFilters() {
  $$(".filter-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.cat;
      applyFilters();
    })
  );
  $("#resultClear").addEventListener("click", () => {
    $("#searchInput").value = "";
    $("#searchClear").style.display = "none";
    $("#suggestions").classList.remove("open");
    applyFilters();
  });
}

function applyFilters() {
  const q = $("#searchInput").value.trim().toLowerCase();
  const cards = $$("#vehiclesGrid .vehicle-card");
  let visible = 0;
  cards.forEach((card) => {
    const b = card.dataset.brand;
    const m = card.dataset.model;
    const cats = (card.dataset.category || "").split(" ");
    const matchSearch = !q || b.includes(q) || m.includes(q) || (b + " " + m).includes(q);
    const matchBrand = currentBrand === "todas" || b === currentBrand;
    const matchCat = currentCategory === "todos" || cats.includes(currentCategory);
    const show = matchSearch && matchBrand && matchCat;
    card.style.display = show ? "" : "none";
    if (show) visible++;
  });

  const info = $("#resultInfo");
  const noRes = $("#noResults");
  if (q || currentBrand !== "todas") {
    const label = q ? `"${q}"` : `Marca: ${currentBrand.charAt(0).toUpperCase() + currentBrand.slice(1)}`;
    $("#resultInfoText").innerHTML = `<strong>${visible}</strong> veículo${visible !== 1 ? "s" : ""} encontrado${visible !== 1 ? "s" : ""} para ${label}`;
    info.classList.add("visible");
    noRes.classList.toggle("visible", visible === 0);
  } else {
    info.classList.remove("visible");
    noRes.classList.toggle("visible", visible === 0 && CARS.length > 0 && currentCategory !== "todos");
  }
}

// ---------- Busca com sugestões ----------
function wireSearch() {
  const inp = $("#searchInput");
  const clr = $("#searchClear");
  const sug = $("#suggestions");

  inp.addEventListener("input", () => {
    const val = inp.value;
    clr.style.display = val ? "block" : "none";
    const q = val.trim().toLowerCase();
    if (!q) {
      sug.classList.remove("open");
      sug.innerHTML = "";
    } else {
      const matches = CARS.filter(
        (v) => v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)
      ).slice(0, 6);
      if (matches.length) {
        sug.innerHTML = matches
          .map((v) => {
            const cat = (v.category || "").includes("novo") && !(v.category || "").includes("seminovo")
              ? "0KM"
              : (v.category || "").charAt(0).toUpperCase() + (v.category || "").slice(1);
            return `<div class="suggestion-item" data-txt="${escapeAttr(v.brand + " " + v.model)}">
              <div class="suggestion-item-icon"><i class="fas fa-car"></i></div>
              <div class="suggestion-item-text">
                <strong>${escapeHtml(v.brand)} · ${escapeHtml(v.model)}</strong>
                <span>${v.year} · ${cat}</span>
              </div>
            </div>`;
          })
          .join("");
        sug.classList.add("open");
        $$(".suggestion-item", sug).forEach((s) =>
          s.addEventListener("mousedown", () => {
            inp.value = s.dataset.txt;
            clr.style.display = "block";
            sug.classList.remove("open");
            applyFilters();
          })
        );
      } else {
        sug.classList.remove("open");
      }
    }
    applyFilters();
  });

  inp.addEventListener("blur", () => setTimeout(() => sug.classList.remove("open"), 180));
  clr.addEventListener("click", () => {
    inp.value = "";
    clr.style.display = "none";
    sug.classList.remove("open");
    applyFilters();
  });
}

// ---------- Form de contato ----------
function wireContactForm() {
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = $("#c-nome").value.trim();
    const tel = $("#c-tel").value.trim();
    const email = $("#c-email").value.trim();
    const interesse = $("#c-int").value;
    const msg = $("#c-msg").value.trim();
    let t = `Olá! Meu nome é ${nome} (${tel}).`;
    if (email) t += ` E-mail: ${email}.`;
    if (interesse) t += ` Tenho interesse em: ${interesse}.`;
    if (msg) t += ` Mensagem: ${msg}`;
    openWaChooser(t);
  });
}

// ---------- Seletor de sócio (WhatsApp Bruno / Júnior) ----------
function wireWhatsChooser() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href*="wa.me/"]');
    if (!a) return;
    e.preventDefault();
    let text = "Olá! Vim pelo site da JB Multimarcas e gostaria de mais informações.";
    try {
      const u = new URL(a.href);
      const t = u.searchParams.get("text");
      if (t) text = t;
    } catch (_) {}
    openWaChooser(text);
  });
}

function openWaChooser(text) {
  // Remove modal anterior se existir
  const prev = document.getElementById("waChooserModal");
  if (prev) prev.remove();

  const modal = document.createElement("div");
  modal.id = "waChooserModal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(4,4,10,.88);backdrop-filter:blur(10px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px 16px;font-family:Inter,sans-serif";
  const socios = SOCIOS.map((s) => `
    <a href="https://wa.me/${s.fone}?text=${encodeURIComponent(text)}" target="_blank" rel="noreferrer"
       class="wa-choice"
       style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px 16px;text-decoration:none;color:#fff;transition:background .2s,border-color .2s">
      <div style="width:44px;height:44px;border-radius:50%;background:${s.cor};color:#0a0a0a;display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;font-weight:800;font-size:18px">${s.inicial}</div>
      <div style="flex:1">
        <div style="font-family:Outfit,sans-serif;font-weight:700;font-size:15px">Falar com ${s.nome}</div>
        <div style="color:rgba(255,255,255,.5);font-size:12px;margin-top:2px">(${s.fone.slice(2,4)}) ${s.fone.slice(4,9)}-${s.fone.slice(9)}</div>
      </div>
      <div style="color:#25D366;font-size:22px"><i class="fab fa-whatsapp"></i></div>
    </a>
  `).join("");
  modal.innerHTML = `
    <div class="wa-card" style="background:#0b0b14;border:1px solid rgba(255,255,255,.08);border-radius:22px;max-width:400px;width:100%;color:#fff;padding:28px 24px;position:relative;box-shadow:0 40px 80px -20px rgba(0,0,0,.7)">
      <button class="wa-close" aria-label="Fechar" style="position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.55);color:#fff;cursor:pointer;font-size:16px">×</button>
      <div style="text-align:center;margin-bottom:20px">
        <div style="color:#25D366;font-size:34px;margin-bottom:8px"><i class="fab fa-whatsapp"></i></div>
        <h3 style="font-family:Outfit,sans-serif;font-size:22px;font-weight:700;margin:0 0 6px">Fale com a JB Multimarcas</h3>
        <p style="color:rgba(255,255,255,.6);font-size:13px;margin:0">Escolha com qual sócio você quer conversar:</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">${socios}</div>
    </div>
  `;
  const close = () => { modal.remove(); document.body.style.overflow = ""; };
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  modal.querySelector(".wa-close").addEventListener("click", close);
  modal.querySelectorAll(".wa-choice").forEach((el) => {
    el.addEventListener("mouseenter", () => { el.style.background = "rgba(37,211,102,.08)"; el.style.borderColor = "rgba(37,211,102,.4)"; });
    el.addEventListener("mouseleave", () => { el.style.background = "rgba(255,255,255,.04)"; el.style.borderColor = "rgba(255,255,255,.08)"; });
    el.addEventListener("click", () => setTimeout(close, 100));
  });
  document.body.style.overflow = "hidden";
  document.body.appendChild(modal);
}

// ---------- Modal do carro ----------
function carGallery(c) {
  const arr = [c.image_url].concat(Array.isArray(c.images) ? c.images : []).filter(Boolean);
  return arr;
}

function openCarModal(c) {
  const gallery = carGallery(c);
  let idx = 0;
  const specs = [];
  if (c.transmission) specs.push({ label: "Câmbio", value: c.transmission });
  if (c.fuel) specs.push({ label: "Combustível", value: c.fuel });
  if (c.color) specs.push({ label: "Cor", value: c.color });
  specs.push({ label: "Quilometragem", value: `${fmtKm(c.km)} km` });

  const yearLine = (c.category || "").includes("novo") && !(c.category || "").includes("seminovo")
    ? `${c.year} · 0 km · Novo`
    : `${c.year} · ${fmtKm(c.km)} km`;

  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;inset:0;background:rgba(4,4,10,.88);backdrop-filter:blur(10px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow-y:auto;font-family:Inter,sans-serif";
  modal.innerHTML = `
    <div class="modal-card" style="background:#080810;border:1px solid rgba(255,255,255,.06);border-radius:24px;max-width:480px;width:100%;color:#fff;position:relative;overflow:hidden;box-shadow:0 40px 80px -20px rgba(0,0,0,.7)">
      <button class="mx-close" aria-label="Fechar" style="position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.55);backdrop-filter:blur(10px);color:#fff;cursor:pointer;font-size:18px;z-index:3">×</button>
      <div class="mx-gallery" style="position:relative;background:#101018;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;overflow:hidden"></div>
      <div class="mx-thumbs" style="display:${gallery.length > 1 ? "flex" : "none"};gap:8px;padding:0 20px;margin-top:-28px;position:relative;z-index:2;overflow-x:auto"></div>
      <div style="padding:28px 24px 24px">
        <div style="margin-bottom:24px">
          <div style="color:#FFC501;font-family:Outfit,sans-serif;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">${escapeHtml(c.brand)}</div>
          <h3 style="font-family:Outfit,sans-serif;font-size:30px;font-weight:700;line-height:1.05;margin:0;letter-spacing:-.5px">${escapeHtml(c.model)}</h3>
          <div style="display:flex;align-items:center;gap:10px;margin-top:10px;color:rgba(255,255,255,.5);font-size:13px">
            <span>${c.year}</span><span style="width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.25)"></span>
            <span>${yearLine.split("·").slice(1).join("·").trim() || fmtKm(c.km) + " km"}</span>
          </div>
        </div>
        ${c.price ? `<div style="margin-bottom:28px"><div style="color:rgba(255,255,255,.4);font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-bottom:6px">Preço JB Multimarcas</div><div style="font-family:Outfit,sans-serif;font-size:34px;font-weight:700;color:#FFC501;letter-spacing:-.5px;line-height:1">R$ ${Number(c.price).toLocaleString("pt-BR")}</div></div>` : ""}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px">
          ${specs.map((s) => `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:4px"><span style="font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1.5px;font-weight:600">${escapeHtml(s.label)}</span><span style="color:#fff;font-size:14px;font-weight:500">${escapeHtml(s.value)}</span></div>`).join("")}
        </div>
        ${c.description ? `<div style="margin-bottom:32px"><h4 style="font-family:Outfit,sans-serif;color:#fff;font-size:15px;font-weight:600;margin:0 0 12px;display:flex;align-items:center;gap:10px"><span style="width:22px;height:2px;background:#FFC501;display:inline-block"></span>Sobre o veículo</h4><p style="color:rgba(255,255,255,.7);font-size:14px;line-height:1.65;margin:0;white-space:pre-wrap">${escapeHtml(c.description)}</p></div>` : ""}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <a href="${wa(`Olá! Tenho interesse no ${c.brand} ${c.model} ${c.year}.`)}" target="_blank" rel="noreferrer" style="display:flex;align-items:center;justify-content:center;gap:10px;background:#25D366;color:#fff;padding:16px 18px;border-radius:16px;text-decoration:none;font-family:Outfit,sans-serif;font-weight:700;font-size:14px;letter-spacing:.3px;box-shadow:0 12px 30px -8px rgba(37,211,102,.35)"><i class="fab fa-whatsapp" style="font-size:18px"></i> Tenho interesse</a>
          <a href="${wa(`Olá! Gostaria de agendar uma visita para ver o ${c.brand} ${c.model} ${c.year} pessoalmente. Qual o melhor horário?`)}" target="_blank" rel="noreferrer" style="display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(135deg,#d4af37 0%,#b8952e 100%);color:#0a0a0a;padding:16px 18px;border-radius:16px;text-decoration:none;font-family:Outfit,sans-serif;font-weight:700;font-size:14px;letter-spacing:.3px;box-shadow:0 12px 30px -8px rgba(212,175,55,.4)"><i class="fas fa-calendar-check" style="font-size:16px"></i> Agendar visita</a>
        </div>
        <div style="margin-top:24px;display:flex;justify-content:center;padding-bottom:4px">
          <button class="mx-close" style="background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.35);font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:3px;padding-bottom:4px;cursor:pointer">Voltar ao showroom</button>
        </div>
      </div>
    </div>
  `;

  const renderGallery = () => {
    const g = modal.querySelector(".mx-gallery");
    const img = gallery[idx];
    g.innerHTML = `
      ${img ? `<img src="${escapeAttr(img)}" alt="${escapeAttr(c.brand + " " + c.model)}" style="width:100%;height:100%;object-fit:cover" />` : `<i class="fas fa-car" style="font-size:90px;color:rgba(255,197,1,.2)"></i>`}
      <div style="position:absolute;inset:0;background:linear-gradient(to top,#080810 0%,rgba(8,8,16,0) 55%);pointer-events:none"></div>
      ${gallery.length > 1 ? `
        <button class="mx-prev" aria-label="Anterior" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.45);backdrop-filter:blur(10px);color:#fff;cursor:pointer;font-size:18px">‹</button>
        <button class="mx-next" aria-label="Próxima" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.45);backdrop-filter:blur(10px);color:#fff;cursor:pointer;font-size:18px">›</button>
        <div style="position:absolute;bottom:18px;right:18px;background:rgba(0,0,0,.6);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.85);font-size:10px;padding:5px 12px;border-radius:999px;letter-spacing:2px;text-transform:uppercase;font-weight:500">${String(idx + 1).padStart(2, "0")} / ${String(gallery.length).padStart(2, "0")}</div>
      ` : ""}
    `;
    if (gallery.length > 1) {
      g.querySelector(".mx-prev").onclick = () => { idx = (idx - 1 + gallery.length) % gallery.length; renderGallery(); renderThumbs(); };
      g.querySelector(".mx-next").onclick = () => { idx = (idx + 1) % gallery.length; renderGallery(); renderThumbs(); };
    }
  };
  const renderThumbs = () => {
    const t = modal.querySelector(".mx-thumbs");
    if (gallery.length <= 1) return;
    t.innerHTML = gallery.slice(0, 4).map((url, i) => `
      <button data-i="${i}" style="flex:0 0 auto;width:64px;height:48px;border-radius:8px;overflow:hidden;border:${i === idx ? "2px solid #FFC501" : "1px solid rgba(255,255,255,.1)"};padding:0;cursor:pointer;background:#141420;opacity:${i === idx ? 1 : 0.55}">
        <img src="${escapeAttr(url)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" />
      </button>
    `).join("") + (gallery.length > 4 ? `<div style="flex:0 0 auto;width:64px;height:48px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#141420;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6);font-size:11px;font-weight:600">+${gallery.length - 4}</div>` : "");
    t.querySelectorAll("button[data-i]").forEach((b) => b.addEventListener("click", () => { idx = Number(b.dataset.i); renderGallery(); renderThumbs(); }));
  };

  renderGallery();
  renderThumbs();

  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  modal.querySelectorAll(".mx-close").forEach((b) => b.addEventListener("click", close));
  document.body.style.overflow = "hidden";
  $("#carModal").innerHTML = "";
  $("#carModal").appendChild(modal);

  function close() {
    modal.remove();
    document.body.style.overflow = "";
  }
}

// ---------- Utilidades ----------
function observeFadeIn() {
  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } }),
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
  );
  $$(".fade-in-up").forEach((el) => obs.observe(el));
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

// ---------- Status Aberto/Fechado em tempo real ----------
const SCHEDULE = {
  0: null,              // Domingo
  1: [7 * 60 + 30, 18 * 60],       // Segunda
  2: [7 * 60 + 30, 17 * 60],       // Terça
  3: [7 * 60 + 30, 17 * 60],       // Quarta
  4: [7 * 60 + 30, 17 * 60],       // Quinta
  5: [7 * 60 + 30, 17 * 60],       // Sexta
  6: [8 * 60, 12 * 60],            // Sábado
};
const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function fmtMin(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function nextOpening(day, min) {
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    const s = SCHEDULE[d];
    if (!s) continue;
    if (i === 0 && min < s[0]) return { day: d, open: s[0], sameDay: true };
    if (i > 0) return { day: d, open: s[0], sameDay: false };
  }
  return null;
}

function updateOpenStatus() {
  const el = $("#openStatus");
  if (!el) return;
  const now = new Date();
  const day = now.getDay();
  const min = now.getHours() * 60 + now.getMinutes();
  const s = SCHEDULE[day];
  let cls, txt;
  if (s && min >= s[0] && min < s[1]) {
    cls = "is-open";
    txt = `Aberto agora · fecha às ${fmtMin(s[1])}`;
  } else {
    cls = "is-closed";
    const nx = nextOpening(day, min);
    if (nx) {
      const when = nx.sameDay ? `hoje às ${fmtMin(nx.open)}` : `${DAY_NAMES[nx.day]} às ${fmtMin(nx.open)}`;
      txt = `Fechado agora · abre ${when}`;
    } else {
      txt = "Fechado";
    }
  }
  el.className = `open-status ${cls}`;
  el.textContent = txt;

  $$(".horario-item").forEach((it) => {
    it.classList.toggle("today", Number(it.dataset.day) === day);
  });
}

function wireOpenStatus() {
  updateOpenStatus();
  setInterval(updateOpenStatus, 60 * 1000);
}