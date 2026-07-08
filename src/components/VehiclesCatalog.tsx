import { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { whatsappUrl, type Car } from "@/lib/cars";

function fmtKm(km: number) { return km.toLocaleString("pt-BR"); }
function badgeFor(cat: string) {
  return cat.includes("novo") && !cat.includes("seminovo")
    ? { cls: "badge-novo", label: "0KM" }
    : { cls: "badge-seminovo", label: "Seminovo" };
}

type Props = {
  cars: Car[];
  showFilters?: boolean;
  limit?: number;
  viewAllHref?: string;
};

export default function VehiclesCatalog({ cars, showFilters = false, limit, viewAllHref }: Props) {
  const [searchVal, setSearchVal] = useState("");
  const [suggestions, setSuggestions] = useState<Car[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentCategory, setCurrentCategory] = useState("todos");
  const [currentBrand, setCurrentBrand] = useState("todas");
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.body.style.overflow = selectedCar ? "hidden" : "";
    if (selectedCar) setGalleryIdx(0);
    return () => { document.body.style.overflow = ""; };
  }, [selectedCar]);

  const sortedAvailable = useMemo(() => {
    const list = cars.filter((c) => !c.sold);
    list.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
    return list;
  }, [cars]);

  const filtered = useMemo(() => {
    if (!showFilters) return sortedAvailable;
    const q = searchVal.trim().toLowerCase();
    return sortedAvailable.filter((c) => {
      const b = c.brand.toLowerCase();
      const m = c.model.toLowerCase();
      const cats = (c.category || "").split(" ");
      const matchSearch = !q || b.includes(q) || m.includes(q) || `${b} ${m}`.includes(q);
      const matchBrand = currentBrand === "todas" || b === currentBrand;
      const matchCategory = currentCategory === "todos" || cats.includes(currentCategory);
      return matchSearch && matchBrand && matchCategory;
    });
  }, [sortedAvailable, showFilters, searchVal, currentBrand, currentCategory]);

  const display = limit ? filtered.slice(0, limit) : filtered;

  const brandOptions = useMemo(() => {
    const set = new Set(sortedAvailable.map((c) => c.brand.toLowerCase()));
    return Array.from(set);
  }, [sortedAvailable]);

  const q = searchVal.trim().toLowerCase();
  const activeFilter = q !== "" || currentBrand !== "todas";
  const resultLabel = q ? `"${q}"` : `Marca: ${currentBrand.charAt(0).toUpperCase() + currentBrand.slice(1)}`;

  function clearSearch() {
    setSearchVal(""); setSuggestions([]); setShowSuggestions(false);
  }
  function handleSearchInput(val: string) {
    setSearchVal(val);
    const qq = val.trim().toLowerCase();
    if (!qq) { setSuggestions([]); setShowSuggestions(false); }
    else {
      const matches = sortedAvailable.filter((v) => v.brand.toLowerCase().includes(qq) || v.model.toLowerCase().includes(qq));
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    }
  }
  function selectSuggestion(text: string) {
    setSearchVal(text); setShowSuggestions(false);
  }
  function highlightText(text: string, query: string) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <em key={i} style={{ color: "var(--gold)", fontStyle: "normal" }}>{part}</em>
        : part
    );
  }

  function carGallery(c: Car): string[] {
    const list = [c.image_url, ...((c.images || []) as string[])].filter(Boolean) as string[];
    return list;
  }

  return (
    <>
      {showFilters && (
        <>
          <div className="catalog-search-wrapper fade-in-up">
            <div className="catalog-search-box">
              <span className="catalog-search-icon"><i className="fas fa-search"></i></span>
              <input
                type="text"
                placeholder="Buscar por marca ou modelo... ex: Toyota, Onix, Hilux"
                autoComplete="off"
                value={searchVal}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => { if (searchVal.length > 0) setShowSuggestions(suggestions.length > 0); }}
                onBlur={() => { blurTimeout.current = setTimeout(() => setShowSuggestions(false), 180); }}
              />
              <button className="catalog-search-clear" onClick={clearSearch} style={{ display: searchVal ? "block" : "none" }} title="Limpar busca" aria-label="Limpar busca">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={`catalog-suggestions${showSuggestions ? " open" : ""}`}>
              {suggestions.map((v, i) => (
                <div key={i} className="suggestion-item" onMouseDown={() => selectSuggestion(`${v.brand} ${v.model}`)}>
                  <div className="suggestion-item-icon"><i className="fas fa-car"></i></div>
                  <div className="suggestion-item-text">
                    <strong>{highlightText(v.brand, q)} · {highlightText(v.model, q)}</strong>
                    <span>{v.year} · {v.category.includes("novo") && !v.category.includes("seminovo") ? "0KM" : v.category.charAt(0).toUpperCase() + v.category.slice(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="catalog-brand-pills fade-in-up">
            {[{ brand: "todas", label: "Todas as Marcas", icon: "fa-th" },
              ...brandOptions.map((b) => ({ brand: b, label: b.charAt(0).toUpperCase() + b.slice(1), icon: "fa-car" }))
            ].map((item) => (
              <button key={item.brand} className={`brand-pill${currentBrand === item.brand ? " active" : ""}`} onClick={() => { setCurrentBrand(item.brand); clearSearch(); }}>
                <i className={`fas ${item.icon}`}></i> {item.label}
              </button>
            ))}
          </div>

          <div className={`catalog-result-info${activeFilter ? " visible" : ""}`}>
            <i className="fas fa-filter"></i>
            <span><strong>{filtered.length}</strong> veículo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""} para {resultLabel}</span>
            <button className="result-clear-btn" onClick={() => { clearSearch(); setCurrentBrand("todas"); setCurrentCategory("todos"); }}>Limpar filtro</button>
          </div>

          <div className="catalog-filters fade-in-up">
            {[{ key: "todos", label: "Todos" },
              { key: "novo", label: "0KM / Novos" },
              { key: "seminovo", label: "Seminovos" },
              { key: "suv", label: "SUVs" },
              { key: "pickup", label: "Pickups" },
            ].map((item) => (
              <button key={item.key} className={`filter-btn${currentCategory === item.key ? " active" : ""}`} onClick={() => setCurrentCategory(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="vehicles-grid">
        {showFilters && display.length === 0 && (
          <div className="catalog-no-results visible">
            <div className="no-results-icon"><i className="fas fa-car-side"></i></div>
            <div className="no-results-title">Nenhum veículo encontrado</div>
            <p className="no-results-text">Não encontramos veículos com esse nome.<br />Tente buscar por outra marca ou modelo.</p>
            <a href={whatsappUrl("Olá! Estou buscando um veículo específico e gostaria de ajuda.")} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: "inline-flex" }}>
              <i className="fab fa-whatsapp"></i> Perguntar pelo WhatsApp
            </a>
          </div>
        )}

        {display.map((c) => {
          const b = badgeFor(c.category);
          const yearLine = c.category.includes("novo") && !c.category.includes("seminovo")
            ? `${c.year} · 0 km · Novo`
            : `${c.year} · ${fmtKm(c.km)} km`;
          return (
            <div key={c.id} className="vehicle-card fade-in-up visible"
              data-category={c.category} data-brand={c.brand.toLowerCase()} data-model={c.model.toLowerCase()}
              onClick={() => setSelectedCar(c)} style={{ cursor: "pointer" }}>
              <div className="vehicle-card-image">
                {c.image_url ? (
                  <img src={c.image_url} alt={`${c.brand} ${c.model} ${c.year}`} loading="lazy" />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#0a0a18,#141426)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className={`fas ${c.category.includes("pickup") ? "fa-truck-pickup" : "fa-car"}`} style={{ fontSize: "80px", color: "rgba(255,197,1,0.2)" }}></i>
                  </div>
                )}
                <span className={`vehicle-badge ${b.cls}`}>{b.label}</span>
              </div>
              <div className="vehicle-card-content">
                <div className="vehicle-brand">{c.brand}</div>
                <div className="vehicle-name">{c.model}</div>
                <div className="vehicle-year">{yearLine}</div>
                <div className="vehicle-specs">
                  {c.fuel && <span className="vehicle-spec"><i className="fas fa-gas-pump"></i> {c.fuel}</span>}
                  {c.transmission && <span className="vehicle-spec"><i className="fas fa-cog"></i> {c.transmission}</span>}
                  {c.color && <span className="vehicle-spec"><i className="fas fa-palette"></i> {c.color}</span>}
                </div>
                <div className="vehicle-card-footer">
                  <a href={whatsappUrl(`Olá! Tenho interesse no ${c.brand} ${c.model} ${c.year}.`)}
                     target="_blank" rel="noreferrer" className="vehicle-btn" onClick={(e) => e.stopPropagation()}>
                    <i className="fab fa-whatsapp"></i> Tenho Interesse
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {viewAllHref && (
        <div className="catalog-cta-wrapper fade-in-up">
          <Link to={viewAllHref} className="btn-primary">
            <i className="fas fa-car-side"></i> Ver todos os veículos
          </Link>
        </div>
      )}

      {selectedCar && (() => {
        const c = selectedCar;
        const gallery = carGallery(c);
        const currentImg = gallery.length ? gallery[Math.min(galleryIdx, gallery.length - 1)] : null;
        const specs: { label: string; value: string }[] = [];
        if (c.transmission) specs.push({ label: "Câmbio", value: c.transmission });
        if (c.fuel) specs.push({ label: "Combustível", value: c.fuel });
        if (c.color) specs.push({ label: "Cor", value: c.color });
        specs.push({ label: "Quilometragem", value: `${fmtKm(c.km)} km` });
        return (
          <div onClick={() => setSelectedCar(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(4,4,10,0.88)", backdropFilter: "blur(10px)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 12px", overflowY: "auto", fontFamily: "Inter, sans-serif" }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ background: "#080810", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 24, maxWidth: 480, width: "100%", color: "#fff", position: "relative", overflow: "hidden", boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7)" }}>
              <button onClick={() => setSelectedCar(null)} aria-label="Fechar"
                style={{ position: "absolute", top: 14, right: 14, width: 38, height: 38, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.55)", color: "#fff", cursor: "pointer", fontSize: 18, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              <div style={{ position: "relative", background: "#101018", aspectRatio: "4 / 3", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {currentImg ? <img src={currentImg} alt={`${c.brand} ${c.model}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <i className="fas fa-car" style={{ fontSize: 90, color: "rgba(255,197,1,0.2)" }}></i>}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #080810 0%, rgba(8,8,16,0) 55%)", pointerEvents: "none" }}></div>
                {gallery.length > 1 && (
                  <>
                    <button onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)} aria-label="Anterior"
                      style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.45)", color: "#fff", cursor: "pointer", fontSize: 18 }}>‹</button>
                    <button onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)} aria-label="Próxima"
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.45)", color: "#fff", cursor: "pointer", fontSize: 18 }}>›</button>
                  </>
                )}
              </div>
              <div style={{ padding: "28px 24px 24px" }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: "#FFC501", fontFamily: "Outfit, sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>{c.brand}</div>
                  <h3 style={{ fontFamily: "Outfit, sans-serif", fontSize: 30, fontWeight: 700, lineHeight: 1.05, margin: 0 }}>{c.model}</h3>
                  <div style={{ marginTop: 10, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{c.year} · {fmtKm(c.km)} km</div>
                </div>
                {c.price && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, marginBottom: 6 }}>Preço JB Multimarcas</div>
                    <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 34, fontWeight: 700, color: "#FFC501" }}>R$ {Number(c.price).toLocaleString("pt-BR")}</div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
                  {specs.map((s, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>{s.label}</div>
                      <div style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {c.description && (
                  <div style={{ marginBottom: 32 }}>
                    <h4 style={{ fontFamily: "Outfit, sans-serif", color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Sobre o veículo</h4>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{c.description}</p>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <a href={whatsappUrl(`Olá! Tenho interesse no ${c.brand} ${c.model} ${c.year}.`)} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#25D366", color: "#fff", padding: "16px 18px", borderRadius: 16, textDecoration: "none", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14 }}>
                    <i className="fab fa-whatsapp" style={{ fontSize: 18 }}></i> Tenho interesse
                  </a>
                  <a href={whatsappUrl(`Olá! Gostaria de agendar uma visita para ver o ${c.brand} ${c.model} ${c.year}.`)} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "linear-gradient(135deg, #d4af37, #b8952e)", color: "#0a0a0a", padding: "16px 18px", borderRadius: 16, textDecoration: "none", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14 }}>
                    <i className="fas fa-calendar-check" style={{ fontSize: 16 }}></i> Agendar visita
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
