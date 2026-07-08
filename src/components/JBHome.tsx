import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { carsQueryOptions, whatsappUrl, type Car } from "@/lib/cars";

function fmtKm(km: number) {
  return km.toLocaleString("pt-BR");
}
function badgeFor(cat: string) {
  return cat.includes("novo") && !cat.includes("seminovo")
    ? { cls: "badge-novo", label: "0KM" }
    : { cls: "badge-seminovo", label: "Seminovo" };
}

const SCHEDULE: Record<number, [number, number] | null> = {
  0: null,
  1: [7 * 60 + 30, 18 * 60],
  2: [7 * 60 + 30, 17 * 60],
  3: [7 * 60 + 30, 17 * 60],
  4: [7 * 60 + 30, 17 * 60],
  5: [7 * 60 + 30, 17 * 60],
  6: [8 * 60, 12 * 60],
};
const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function fmtMin(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function computeOpenStatus(now: Date) {
  const day = now.getDay();
  const min = now.getHours() * 60 + now.getMinutes();
  const s = SCHEDULE[day];
  if (s && min >= s[0] && min < s[1]) {
    return { day, open: true as const, text: `Aberto agora · fecha às ${fmtMin(s[1])}` };
  }
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    const sc = SCHEDULE[d];
    if (!sc) continue;
    if (i === 0 && min < sc[0]) {
      return { day, open: false as const, text: `Fechado agora · abre hoje às ${fmtMin(sc[0])}` };
    }
    if (i > 0) {
      return { day, open: false as const, text: `Fechado agora · abre ${DAY_NAMES[d]} às ${fmtMin(sc[0])}` };
    }
  }
  return { day, open: false as const, text: "Fechado" };
}

export default function JBHome() {
  const { data: cars } = useSuspenseQuery(carsQueryOptions);

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [suggestions, setSuggestions] = useState<Car[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentCategory, setCurrentCategory] = useState("todos");
  const [currentBrand, setCurrentBrand] = useState("todas");
  const [calcValor, setCalcValor] = useState("");
  const [calcEntrada, setCalcEntrada] = useState("");
  const [calcParcelas, setCalcParcelas] = useState<string | number>(60);
  const [calcResult, setCalcResult] = useState("R$ --");
  const [calcNote, setCalcNote] = useState("Preencha os campos acima para simular");
  const [formData, setFormData] = useState({ nome: "", telefone: "", email: "", interesse: "", mensagem: "" });
  const [resultInfo, setResultInfo] = useState<{ visible: boolean; text: string }>({ visible: false, text: "" });
  const [noResults, setNoResults] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [openStatus, setOpenStatus] = useState(() => computeOpenStatus(new Date()));
  useEffect(() => {
    const tick = () => setOpenStatus(computeOpenStatus(new Date()));
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  useEffect(() => {
    if (selectedCar) {
      document.body.style.overflow = "hidden";
      setGalleryIdx(0);
    } else if (!menuOpen) {
      document.body.style.overflow = "";
    }
  }, [selectedCar, menuOpen]);

  function openCar(c: Car) {
    setSelectedCar(c);
  }

  function carGallery(c: Car): string[] {
    const list = [c.image_url, ...((c.images || []) as string[])].filter(Boolean) as string[];
    return list.length ? list : [];
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    document.querySelectorAll(".fade-in-up").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [cars.length]);

  const applyFilters = (search = searchVal, brand = currentBrand, category = currentCategory) => {
    const nodes = document.querySelectorAll<HTMLElement>(".vehicle-card");
    let visibleCount = 0;
    nodes.forEach((card) => {
      const cardBrand = (card.dataset.brand || "").toLowerCase();
      const cardModel = (card.dataset.model || "").toLowerCase();
      const cats = (card.dataset.category || "").split(" ");
      const q = search.trim().toLowerCase();
      const matchSearch = !q || cardBrand.includes(q) || cardModel.includes(q) || (cardBrand + " " + cardModel).includes(q);
      const matchBrand = brand === "todas" || cardBrand === brand;
      const matchCategory = category === "todos" || cats.includes(category);
      const show = matchSearch && matchBrand && matchCategory;
      if (show) {
        visibleCount++;
        card.style.opacity = "1";
        card.style.transform = "";
        card.style.display = "";
      } else {
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";
        setTimeout(() => {
          card.style.display = "none";
        }, 300);
      }
    });
    const q = search.trim().toLowerCase();
    if (q || brand !== "todas") {
      const label = q ? `"${q}"` : `Marca: ${brand.charAt(0).toUpperCase() + brand.slice(1)}`;
      setResultInfo({
        visible: true,
        text: `<strong>${visibleCount}</strong> veículo${visibleCount !== 1 ? "s" : ""} encontrado${visibleCount !== 1 ? "s" : ""} para ${label}`,
      });
      setNoResults(visibleCount === 0);
    } else {
      setResultInfo({ visible: false, text: "" });
      setNoResults(false);
    }
  };

  const handleSearchInput = (val: string) => {
    setSearchVal(val);
    const q = val.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      const matches = cars.filter(
        (v) => v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)
      );
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    }
    applyFilters(val, currentBrand, currentCategory);
  };

  const clearSearch = () => {
    setSearchVal("");
    setSuggestions([]);
    setShowSuggestions(false);
    applyFilters("", currentBrand, currentCategory);
  };

  const selectSuggestion = (text: string) => {
    setSearchVal(text);
    setShowSuggestions(false);
    applyFilters(text, currentBrand, currentCategory);
  };

  const filterByBrand = (brand: string) => {
    setCurrentBrand(brand);
    setSearchVal("");
    setSuggestions([]);
    setShowSuggestions(false);
    applyFilters("", brand, currentCategory);
  };

  const filterVehicles = (cat: string) => {
    setCurrentCategory(cat);
    applyFilters(searchVal, currentBrand, cat);
  };

  useEffect(() => {
    const valor = parseFloat(calcValor) || 0;
    const entrada = parseFloat(calcEntrada) || 0;
    const parcelas = parseInt(String(calcParcelas)) || 60;
    if (valor <= 0 || entrada >= valor) {
      setCalcResult("R$ --");
      setCalcNote("Preencha os campos acima para simular");
      return;
    }
    const taxa = 0.0169;
    const financiado = valor - entrada;
    const parcela = (financiado * (taxa * Math.pow(1 + taxa, parcelas))) / (Math.pow(1 + taxa, parcelas) - 1);
    setCalcResult("R$ " + parcela.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setCalcNote(`${parcelas}x de R$${parcela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · Taxa ref. 1,69% a.m. · Sujeito a análise de crédito`);
  }, [calcValor, calcEntrada, calcParcelas]);

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    let text = `Olá! Meu nome é ${formData.nome} (${formData.telefone}).`;
    if (formData.email) text += ` E-mail: ${formData.email}.`;
    if (formData.interesse) text += ` Tenho interesse em: ${formData.interesse}.`;
    if (formData.mensagem) text += ` Mensagem: ${formData.mensagem}`;
    window.open(whatsappUrl(text), "_blank");
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <em key={i} style={{ color: "var(--gold)", fontStyle: "normal" }}>{part}</em>
      ) : (
        part
      )
    );
  };

  return (
    <div className="jb-app">
      {/* NAVBAR */}
      <nav id="navbar" className={scrolled ? "scrolled" : ""}>
        <a href="#hero" className="nav-logo">
          <img src="/assets/images/logo.png" alt="JB Multimarcas" className="nav-logo-img" />
        </a>
        <ul className="nav-links">
          <li><a href="#catalogo">Catálogo</a></li>
          <li><a href="#sobre">Sobre</a></li>
          <li><a href="#avaliacoes">Avaliações</a></li>
          <li><a href="#contato" className="nav-cta">Falar Conosco</a></li>
          <li>
            <Link to="/auth" className="jb-admin-key" title="Área restrita" aria-label="Painel administrativo">
              <span className="jb-admin-key__icon"><i className="fas fa-key"></i></span>
              <span className="jb-admin-key__label">Restrito</span>
              <span className="jb-admin-key__shine" aria-hidden="true"></span>
            </Link>
          </li>
        </ul>
        <button className={`nav-hamburger${menuOpen ? " active" : ""}`} onClick={() => setMenuOpen((m) => !m)} aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </nav>

      <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
        <a href="#catalogo" onClick={() => setMenuOpen(false)}>Catálogo</a>
        <a href="#sobre" onClick={() => setMenuOpen(false)}>Sobre</a>
        <a href="#avaliacoes" onClick={() => setMenuOpen(false)}>Avaliações</a>
        <a href="#contato" onClick={() => setMenuOpen(false)}>Contato</a>
        <Link to="/auth" onClick={() => setMenuOpen(false)} className="jb-admin-key jb-admin-key--mobile" aria-label="Painel administrativo">
          <span className="jb-admin-key__icon"><i className="fas fa-key"></i></span>
          <span className="jb-admin-key__label">Área Restrita</span>
        </Link>
      </div>

      {/* HERO */}
      <section id="hero">
        <div className="hero-bg"></div>
        <div className="hero-overlay"></div>
        <div className="hero-overlay-bottom"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="sr-only">JB Multimarcas — Veículos 0KM e Seminovos em Cachoeira de Minas. </span>
            A <span className="gold-text">Escolha</span><br />
            Perfeita Para<br />Você
          </h1>
          <p className="hero-subtitle">
            Veículos 0KM e seminovos com procedência garantida, preço justo e o melhor atendimento de Cachoeira de Minas.
          </p>
          <div className="hero-stats">
            <div className="hero-stat-item"><div className="hero-stat-number">Avaliação</div><div className="hero-stat-label">5⭐</div></div>
            <div className="hero-stat-item"><div className="hero-stat-number">4+</div><div className="hero-stat-label">Anos no Mercado</div></div>
            <div className="hero-stat-item"><div className="hero-stat-number">100%</div><div className="hero-stat-label">Satisfação</div></div>
          </div>
          <div className="hero-buttons">
            <a href="#catalogo" className="btn-primary"><i className="fas fa-car"></i>Ver Catálogo</a>
            <a href={whatsappUrl("Olá! Vim pelo site e gostaria de mais informações.")} target="_blank" rel="noreferrer" className="btn-secondary">
              <i className="fab fa-whatsapp"></i>Falar no WhatsApp
            </a>
          </div>
        </div>
        <div className="hero-scroll-indicator">
          <div className="scroll-mouse"></div>
          <span>Role para baixo</span>
        </div>
      </section>

      {/* SERVICES */}
      <div id="services-strip">
        <div className="services-strip-inner">
          {[
            { icon: "fa-tag", title: "Compra & Venda", sub: "Melhores preços do mercado" },
            { icon: "fa-exchange-alt", title: "Troca de Veículos", sub: "Avaliação na hora" },
            { icon: "fa-handshake", title: "Troca com Avaliação", sub: "Avaliamos seu carro na hora" },
            { icon: "fa-coffee", title: "Venha nos Visitar", sub: "Um cafezinho te espera!" },
          ].map((item, i) => (
            <div className="service-strip-item" key={i}>
              <div className="service-strip-icon"><i className={`fas ${item.icon}`}></i></div>
              <div className="service-strip-text"><strong>{item.title}</strong><span>{item.sub}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* CATÁLOGO */}
      <section id="catalogo">
        <div className="section-header fade-in-up">
          <div className="section-tag"><i className="fas fa-car"></i> Estoque</div>
          <h2 className="section-title">Nosso <span className="gold">Catálogo</span></h2>
          <p className="section-subtitle">Veículos selecionados com procedência garantida. 0KM e seminovos esperando por você.</p>
        </div>

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
            {suggestions.map((v, i) => {
              const q = searchVal.trim().toLowerCase();
              return (
                <div key={i} className="suggestion-item" onMouseDown={() => selectSuggestion(`${v.brand} ${v.model}`)}>
                  <div className="suggestion-item-icon"><i className="fas fa-car"></i></div>
                  <div className="suggestion-item-text">
                    <strong>{highlightText(v.brand, q)} · {highlightText(v.model, q)}</strong>
                    <span>{v.year} · {v.category.includes("novo") && !v.category.includes("seminovo") ? "0KM" : v.category.charAt(0).toUpperCase() + v.category.slice(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="catalog-brand-pills fade-in-up">
          {[
            { brand: "todas", label: "Todas as Marcas", icon: "fa-th" },
            ...Array.from(new Set(cars.map((c) => c.brand.toLowerCase()))).map((b) => ({
              brand: b,
              label: b.charAt(0).toUpperCase() + b.slice(1),
              icon: "fa-car",
            })),
          ].map((item) => (
            <button key={item.brand} className={`brand-pill${currentBrand === item.brand ? " active" : ""}`} onClick={() => filterByBrand(item.brand)}>
              <i className={`fas ${item.icon}`}></i> {item.label}
            </button>
          ))}
        </div>

        <div className={`catalog-result-info${resultInfo.visible ? " visible" : ""}`}>
          <i className="fas fa-filter"></i>
          <span dangerouslySetInnerHTML={{ __html: resultInfo.text }}></span>
          <button className="result-clear-btn" onClick={clearSearch}>Limpar filtro</button>
        </div>

        <div className="catalog-filters fade-in-up">
          {[
            { key: "todos", label: "Todos" },
            { key: "novo", label: "0KM / Novos" },
            { key: "seminovo", label: "Seminovos" },
            { key: "suv", label: "SUVs" },
            { key: "pickup", label: "Pickups" },
          ].map((item) => (
            <button key={item.key} className={`filter-btn${currentCategory === item.key ? " active" : ""}`} onClick={() => filterVehicles(item.key)}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="vehicles-grid">
          <div className={`catalog-no-results${noResults ? " visible" : ""}`}>
            <div className="no-results-icon"><i className="fas fa-car-side"></i></div>
            <div className="no-results-title">Nenhum veículo encontrado</div>
            <p className="no-results-text">Não encontramos veículos com esse nome.<br />Tente buscar por outra marca ou modelo.</p>
            <a href={whatsappUrl("Olá! Estou buscando um veículo específico e gostaria de ajuda.")} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: "inline-flex" }}>
              <i className="fab fa-whatsapp"></i> Perguntar pelo WhatsApp
            </a>
          </div>

          {cars.filter((c) => !c.sold).map((c) => {
            const b = badgeFor(c.category);
            const yearLine =
              c.category.includes("novo") && !c.category.includes("seminovo")
                ? `${c.year} · 0 km · Novo`
                : `${c.year} · ${fmtKm(c.km)} km`;
            return (
              <div
                key={c.id}
                className="vehicle-card fade-in-up"
                data-category={c.category}
                data-brand={c.brand.toLowerCase()}
                data-model={c.model.toLowerCase()}
                onClick={() => openCar(c)}
                style={{ cursor: "pointer" }}
              >
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
                    <a
                      href={whatsappUrl(`Olá! Tenho interesse no ${c.brand} ${c.model} ${c.year}.`)}
                      target="_blank"
                      rel="noreferrer"
                      className="vehicle-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <i className="fab fa-whatsapp"></i> Tenho Interesse
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="catalog-cta-wrapper fade-in-up">
          <a href={whatsappUrl("Olá! Gostaria de ver todos os veículos disponíveis.")} target="_blank" rel="noreferrer" className="btn-primary">
            <i className="fab fa-whatsapp"></i> Ver Todo o Estoque no WhatsApp
          </a>
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre">
        <div className="sobre-grid">
          <div className="sobre-image-wrapper fade-in-up">
            <div className="sobre-card-float2"><i className="fas fa-handshake icon-big"></i></div>
            <div className="sobre-image-main">
              <img src="/assets/images/sobre.png" alt="Loja JB Multimarcas em Cachoeira de Minas" loading="lazy" />
            </div>
            <div className="sobre-card-float">
              <div className="number">5⭐</div>
              <div className="text">Avaliações 5 estrelas<br />no Google</div>
            </div>
          </div>
          <div className="sobre-content fade-in-up">
            <div className="section-tag"><i className="fas fa-heart"></i> Nossa História</div>
            <h2 className="section-title">Nascemos da <span className="gold">Amizade</span><br />e do Sonho</h2>
            <p>A JB Multimarcas surgiu da iniciativa de dois amigos, <strong style={{ color: "var(--text-primary)" }}>Júnior e Bruno</strong>. Em 2020, por acaso, venderam juntos o primeiro carro — e isso se tornou recorrente.</p>
            <p>Em julho de 2021, criaram o Instagram para ampliar o alcance do negócio, batizando-o de JB Multimarcas. Em fevereiro de 2024, finalmente tiraram do papel o projeto mais esperado: <strong style={{ color: "var(--gold)" }}>a loja física!</strong></p>
            <p>Hoje, nossa loja em Cachoeira de Minas é o lugar ideal para você garantir seu veículo com segurança, conforto e, claro, um delicioso cafezinho! ☕</p>
            <div className="sobre-founders">
              <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="founder-avatar" style={{ background: "var(--gradient-gold)" }}>J</div>
                  <div className="founder-info"><strong>Júnior</strong><span>Co-fundador</span></div>
                </div>
                <div style={{ width: "1px", height: "40px", background: "var(--dark-border)", margin: "0 8px" }}></div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="founder-avatar" style={{ background: "linear-gradient(135deg,#7eb3ff,#5090e0)", color: "#000" }}>B</div>
                  <div className="founder-info"><strong>Bruno</strong><span>Co-fundador</span></div>
                </div>
              </div>
            </div>
            <div className="sobre-timeline">
              <div className="timeline-item"><span className="timeline-year">2020</span><span className="timeline-desc">Primeira venda realizada — o começo de tudo!</span></div>
              <div className="timeline-item"><span className="timeline-year">2021</span><span className="timeline-desc">Criação do Instagram @jb.multimarcaas e crescimento do negócio.</span></div>
              <div className="timeline-item"><span className="timeline-year">2024</span><span className="timeline-desc">Inauguração da loja física em Cachoeira de Minas — MG!</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* AVALIAÇÕES */}
      <section id="avaliacoes">
        <div className="avaliacoes-header-flex">
          <div className="fade-in-up">
            <div className="section-tag"><i className="fas fa-star"></i> Google Reviews</div>
            <h2 className="section-title">O Que Nossos<br /><span className="gold">Clientes Dizem</span></h2>
          </div>
          <div className="rating-summary fade-in-up">
            <div><div className="rating-big">5,0</div></div>
            <div>
              <div className="rating-stars">★★★★★</div>
              <div className="rating-count">Avaliações positivas no Google</div>
            </div>
          </div>
        </div>
        <div className="reviews-grid">
          {[
            { text: '"Excelente atendimento, além de carros de procedência e preço justo!"', name: "Eder Fernandes", initial: "E", bg: "linear-gradient(135deg,#f4b942,#e8932a)" },
            { text: '"Ofereceu uma boa oportunidade no veículo escolhido. Super recomendo a JB Multimarcas!"', name: "Jean Victor", initial: "J", bg: "linear-gradient(135deg,#4285f4,#2060c0)" },
            { text: '"Atendimento personalizado, variedade de opções. Encontrei exatamente o que queria!"', name: "Search 360", initial: "S", bg: "linear-gradient(135deg,#34a853,#1e7a35)" },
            { text: '"Fui bem recebido, tomei um cafezinho gostoso e saí com meu carro novo. Recomendo muito!"', name: "Marcos Alves", initial: "M", bg: "linear-gradient(135deg,#FFC501,#E5B000)" },
            { text: '"Processo de financiamento super rápido e facilitado. Equipe muito atenciosa e transparente!"', name: "Ana Lima", initial: "A", bg: "linear-gradient(135deg,#e91e63,#880e4f)" },
            { text: '"Carros de ótima procedência, preços honestos. A JB Multimarcas é referência na cidade!"', name: "Roberto Costa", initial: "R", bg: "linear-gradient(135deg,#9c27b0,#6a0080)" },
          ].map((r, i) => (
            <div key={i} className="review-card fade-in-up">
              <div className="review-stars">★★★★★</div>
              <p className="review-text">{r.text}</p>
              <div className="review-author">
                <div className="review-avatar" style={{ background: r.bg }}>{r.initial}</div>
                <div className="review-author-info"><strong>{r.name}</strong><span>Cliente verificado</span></div>
              </div>
              <div className="google-badge"><i className="fab fa-google"></i> Avaliação no Google</div>
            </div>
          ))}
        </div>
      </section>

      {/* CONTATO */}
      <section id="contato">
        <div className="section-header fade-in-up">
          <div className="section-tag"><i className="fas fa-map-marker-alt"></i> Visite-nos</div>
          <h2 className="section-title">Venha nos <span className="gold">Conhecer</span></h2>
          <p className="section-subtitle">Nossa loja está esperando por você em Cachoeira de Minas. Venha tomar um cafezinho!</p>
        </div>
        <div className="contato-grid">
          <div className="contact-info-card fade-in-up">
            <div className="contact-item">
              <div className="contact-icon"><i className="fas fa-map-marker-alt"></i></div>
              <div className="contact-info-text">
                <strong>Endereço</strong>
                <span>Av. Perimetral João Dionísio Filho, 638<br />Bairro do Rosário, Cachoeira de Minas - MG<br />CEP: 37545-000</span>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon"><i className="fas fa-phone-alt"></i></div>
              <div className="contact-info-text">
                <strong>Telefone / WhatsApp</strong>
                <a href="https://wa.me/5535999091119" target="_blank" rel="noreferrer">(35) 99909-1119</a>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon"><i className="fab fa-instagram"></i></div>
              <div className="contact-info-text">
                <strong>Instagram</strong>
                <a href="https://instagram.com/jb.multimarcaas" target="_blank" rel="noreferrer">@jb.multimarcaas</a>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon"><i className="fas fa-clock"></i></div>
              <div className="contact-info-text">
                <strong>Horário de Funcionamento</strong>
                <div className="horario-grid">
                  <div className="horario-item"><span className="day">Segunda</span><span className="time">07:30 – 18:00</span></div>
                  <div className="horario-item"><span className="day">Terça</span><span className="time">07:30 – 17:00</span></div>
                  <div className="horario-item"><span className="day">Quarta</span><span className="time">07:30 – 17:00</span></div>
                  <div className="horario-item"><span className="day">Quinta</span><span className="time">07:30 – 17:00</span></div>
                  <div className="horario-item"><span className="day">Sexta</span><span className="time">07:30 – 17:00</span></div>
                  <div className="horario-item"><span className="day">Sábado</span><span className="time">08:00 – 12:00</span></div>
                  <div className="horario-item closed"><span className="day">Domingo</span><span className="time">Fechado</span></div>
                </div>
              </div>
            </div>
            <div className="map-wrapper">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3752.0!2d-45.764!3d-22.351!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjLCsDIxJzAzLjYiUyA0NcKwNDUnNTAuNCJX!5e0!3m2!1spt-BR!2sbr!4v1234567890"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização JB Multimarcas"
              ></iframe>
            </div>
          </div>
          <div className="contact-form-card fade-in-up">
            <h3>Agende um <span style={{ color: "var(--gold)" }}>Test Drive</span></h3>
            <form onSubmit={submitForm}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contact-nome">Seu Nome</label>
                  <input type="text" className="form-control" id="contact-nome" placeholder="João Silva" required value={formData.nome} onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label htmlFor="contact-telefone">WhatsApp</label>
                  <input type="tel" className="form-control" id="contact-telefone" placeholder="(35) 99999-9999" required value={formData.telefone} onChange={(e) => setFormData((f) => ({ ...f, telefone: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="contact-email">E-mail (opcional)</label>
                <input type="email" className="form-control" id="contact-email" placeholder="joao@email.com" value={formData.email} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="contact-interesse">Veículo de Interesse</label>
                <select className="form-control" id="contact-interesse" value={formData.interesse} onChange={(e) => setFormData((f) => ({ ...f, interesse: e.target.value }))}>
                  <option value="">Selecione ou descreva...</option>
                  {cars.filter((c) => !c.sold).map((c) => (
                    <option key={c.id}>{c.brand} {c.model} {c.year}</option>
                  ))}
                  <option>Outro / Não tenho preferência</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="contact-mensagem">Mensagem</label>
                <textarea className="form-control" id="contact-mensagem" rows={4} placeholder="Olá! Gostaria de agendar um test drive..." style={{ resize: "vertical" }} value={formData.mensagem} onChange={(e) => setFormData((f) => ({ ...f, mensagem: e.target.value }))}></textarea>
              </div>
              <button type="submit" className="btn-submit">
                <i className="fab fa-whatsapp"></i> Enviar via WhatsApp
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#hero" className="nav-logo" style={{ marginBottom: 0 }}>
              <img src="/assets/images/logo.png" alt="JB Multimarcas" className="nav-logo-img" style={{ height: "80px" }} />
            </a>
            <p>A melhor concessionária de veículos novos e seminovos de Cachoeira de Minas. Compra, venda, troca e financiamento com atendimento de qualidade.</p>
            <div className="footer-social">
              <a href="https://wa.me/5535999091119" target="_blank" rel="noreferrer" className="social-btn" title="WhatsApp" aria-label="WhatsApp da JB Multimarcas"><i className="fab fa-whatsapp"></i></a>
              <a href="https://instagram.com/jb.multimarcaas" target="_blank" rel="noreferrer" className="social-btn" title="Instagram" aria-label="Instagram da JB Multimarcas"><i className="fab fa-instagram"></i></a>
              <a href="https://g.co/kgs/JBMultimarcas" target="_blank" rel="noreferrer" className="social-btn" title="Google" aria-label="Perfil da JB Multimarcas no Google"><i className="fab fa-google"></i></a>
            </div>
          </div>
          <div>
            <div className="footer-heading">Navegação</div>
            <ul className="footer-links">
              <li><a href="#catalogo">Catálogo de Veículos</a></li>
              <li><a href="#sobre">Nossa História</a></li>
              <li><a href="#avaliacoes">Avaliações</a></li>
              <li><a href="#contato">Contato</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-heading">Serviços</div>
            <ul className="footer-links">
              <li><a href="#catalogo">Veículos 0KM</a></li>
              <li><a href="#catalogo">Seminovos</a></li>
              <li><a href="#contato">Troca de Veículo</a></li>
              <li><a href="#contato">Test Drive</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-heading">Contato</div>
            <ul className="footer-links">
              <li>Av. Perimetral João Dionísio Filho, 638</li>
              <li>Cachoeira de Minas - MG</li>
              <li>(35) 99909-1119</li>
              <li>@jb.multimarcaas</li>
            </ul>
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--dark-border)", paddingTop: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
          © {new Date().getFullYear()} JB Multimarcas · Todos os direitos reservados
        </div>
      </footer>

      <div id="whatsapp-float">
        <a href={whatsappUrl("Olá! Vim pelo site da JB Multimarcas e gostaria de mais informações.")} target="_blank" rel="noreferrer" className="whatsapp-btn">
          <i className="fab fa-whatsapp"></i>
          <span className="btn-text">Falar no WhatsApp</span>
        </a>
      </div>

      {selectedCar && (() => {
        const c = selectedCar;
        const gallery = carGallery(c);
        const hasGallery = gallery.length > 0;
        const currentImg = hasGallery ? gallery[Math.min(galleryIdx, gallery.length - 1)] : null;
        const yearLine = c.category.includes("novo") && !c.category.includes("seminovo")
          ? `${c.year} · 0 km · Novo`
          : `${c.year} · ${fmtKm(c.km)} km`;
        const specs: { label: string; value: string }[] = [];
        if (c.transmission) specs.push({ label: "Câmbio", value: c.transmission });
        if (c.fuel) specs.push({ label: "Combustível", value: c.fuel });
        if (c.color) specs.push({ label: "Cor", value: c.color });
        specs.push({ label: "Quilometragem", value: `${fmtKm(c.km)} km` });
        return (
          <div
            onClick={() => setSelectedCar(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(4,4,10,0.88)", backdropFilter: "blur(10px)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 12px", overflowY: "auto", fontFamily: "Inter, sans-serif" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#080810", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 24, maxWidth: 480, width: "100%", color: "#fff", position: "relative", overflow: "hidden", boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7)" }}
            >
              {/* Close */}
              <button
                onClick={() => setSelectedCar(null)}
                aria-label="Fechar"
                style={{ position: "absolute", top: 14, right: 14, width: 38, height: 38, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", color: "#fff", cursor: "pointer", fontSize: 18, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}
              >×</button>

              {/* Gallery */}
              <div style={{ position: "relative", background: "#101018", aspectRatio: "4 / 3", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {currentImg ? (
                  <img src={currentImg} alt={`${c.brand} ${c.model}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <i className="fas fa-car" style={{ fontSize: 90, color: "rgba(255,197,1,0.2)" }}></i>
                )}
                {/* Cinematic bottom gradient */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #080810 0%, rgba(8,8,16,0) 55%)", pointerEvents: "none" }}></div>
                {gallery.length > 1 && (
                  <>
                    <button
                      onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                      aria-label="Anterior"
                      style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)", color: "#fff", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >‹</button>
                    <button
                      onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)}
                      aria-label="Próxima"
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)", color: "#fff", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >›</button>
                    <div style={{ position: "absolute", bottom: 18, right: 18, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", fontSize: 10, padding: "5px 12px", borderRadius: 999, letterSpacing: 2, textTransform: "uppercase", fontWeight: 500 }}>
                      {String(Math.min(galleryIdx, gallery.length - 1) + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails overlapping the gallery */}
              {gallery.length > 1 && (
                <div style={{ display: "flex", gap: 8, padding: "0 20px", marginTop: -28, position: "relative", zIndex: 2, overflowX: "auto" }}>
                  {gallery.slice(0, 4).map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIdx(i)}
                      style={{ flex: "0 0 auto", width: 64, height: 48, borderRadius: 8, overflow: "hidden", border: i === galleryIdx ? "2px solid #FFC501" : "1px solid rgba(255,255,255,0.1)", padding: 0, cursor: "pointer", background: "#141420", opacity: i === galleryIdx ? 1 : 0.55, transition: "opacity .2s, border-color .2s" }}
                    >
                      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </button>
                  ))}
                  {gallery.length > 4 && (
                    <div style={{ flex: "0 0 auto", width: 64, height: 48, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#141420", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 600 }}>
                      +{gallery.length - 4}
                    </div>
                  )}
                </div>
              )}

              <div style={{ padding: "28px 24px 24px" }}>
                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: "#FFC501", fontFamily: "Outfit, sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>
                    {c.brand}
                  </div>
                  <h3 style={{ fontFamily: "Outfit, sans-serif", fontSize: 30, fontWeight: 700, lineHeight: 1.05, margin: 0, letterSpacing: -0.5 }}>
                    {c.model}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                    <span>{c.year}</span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }}></span>
                    <span>{yearLine.split("·").slice(1).join("·").trim() || `${fmtKm(c.km)} km`}</span>
                  </div>
                </div>

                {/* Price */}
                {c.price && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, marginBottom: 6 }}>
                      Preço JB Multimarcas
                    </div>
                    <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 34, fontWeight: 700, color: "#FFC501", letterSpacing: -0.5, lineHeight: 1 }}>
                      R$ {Number(c.price).toLocaleString("pt-BR")}
                    </div>
                  </div>
                )}

                {/* Specs grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
                  {specs.map((s, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>{s.label}</span>
                      <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Description */}
                {c.description && (
                  <div style={{ marginBottom: 32 }}>
                    <h4 style={{ fontFamily: "Outfit, sans-serif", color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 22, height: 2, background: "#FFC501", display: "inline-block" }}></span>
                      Sobre o veículo
                    </h4>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                      {c.description}
                    </p>
                  </div>
                )}

                {/* CTAs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <a
                    href={whatsappUrl(`Olá! Tenho interesse no ${c.brand} ${c.model} ${c.year}.`)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#25D366", color: "#fff", padding: "16px 18px", borderRadius: 16, textDecoration: "none", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 0.3, boxShadow: "0 12px 30px -8px rgba(37,211,102,0.35)" }}
                  >
                    <i className="fab fa-whatsapp" style={{ fontSize: 18 }}></i> Tenho interesse
                  </a>
                  <a
                    href={whatsappUrl(`Olá! Gostaria de agendar uma visita para ver o ${c.brand} ${c.model} ${c.year} pessoalmente. Qual o melhor horário?`)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "linear-gradient(135deg, #d4af37 0%, #b8952e 100%)", color: "#0a0a0a", padding: "16px 18px", borderRadius: 16, textDecoration: "none", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 0.3, boxShadow: "0 12px 30px -8px rgba(212,175,55,0.4)" }}
                  >
                    <i className="fas fa-calendar-check" style={{ fontSize: 16 }}></i> Agendar visita
                  </a>
                </div>

                {/* Back link */}
                <div style={{ marginTop: 24, display: "flex", justifyContent: "center", paddingBottom: 4 }}>
                  <button
                    onClick={() => setSelectedCar(null)}
                    style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: 3, paddingBottom: 4, cursor: "pointer" }}
                  >
                    Voltar ao showroom
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}