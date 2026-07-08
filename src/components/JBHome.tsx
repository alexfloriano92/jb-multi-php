import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { carsQueryOptions, whatsappUrl } from "@/lib/cars";
import VehiclesCatalog from "@/components/VehiclesCatalog";
import WaChooser from "@/components/WaChooser";

function fmtKm(km: number) {
  return km.toLocaleString("pt-BR");
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
const INITIAL_STATUS = { day: -1, open: false as const, text: "" };

export default function JBHome() {
  const { data: cars } = useSuspenseQuery(carsQueryOptions);

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calcValor, setCalcValor] = useState("");
  const [calcEntrada, setCalcEntrada] = useState("");
  const [calcParcelas, setCalcParcelas] = useState<string | number>(60);
  const [calcResult, setCalcResult] = useState("R$ --");
  const [calcNote, setCalcNote] = useState("Preencha os campos acima para simular");
  const [formData, setFormData] = useState({ nome: "", telefone: "", email: "", interesse: "", mensagem: "" });

  const [openStatus, setOpenStatus] = useState<ReturnType<typeof computeOpenStatus> | typeof INITIAL_STATUS>(INITIAL_STATUS);
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
    // Abre o mesmo modal seletor do WhatsApp via um link temporário.
    const a = document.createElement("a");
    a.href = `https://wa.me/5535999091119?text=${encodeURIComponent(text)}`;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
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

        <VehiclesCatalog cars={cars} limit={6} viewAllHref="/veiculos" />
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
                <a href="https://wa.me/5535999091119" target="_blank" rel="noreferrer">Júnior: (35) 99909-1119</a>
                <a href="https://wa.me/5535998854358" target="_blank" rel="noreferrer">Bruno: (35) 99885-4358</a>
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
                <div className={`open-status ${openStatus.open ? "is-open" : "is-closed"}`} aria-live="polite">
                  {openStatus.text}
                </div>
                <div className="horario-grid">
                  {[
                    { d: 1, name: "Segunda", time: "07:30 – 18:00" },
                    { d: 2, name: "Terça", time: "07:30 – 17:00" },
                    { d: 3, name: "Quarta", time: "07:30 – 17:00" },
                    { d: 4, name: "Quinta", time: "07:30 – 17:00" },
                    { d: 5, name: "Sexta", time: "07:30 – 17:00" },
                    { d: 6, name: "Sábado", time: "08:00 – 12:00" },
                    { d: 0, name: "Domingo", time: "Fechado", closed: true },
                  ].map((h) => (
                    <div
                      key={h.d}
                      className={`horario-item${h.closed ? " closed" : ""}${openStatus.day === h.d ? " today" : ""}`}
                    >
                      <span className="day">{h.name}</span>
                      <span className="time">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="map-wrapper">
              <iframe
                src="https://www.google.com/maps?q=JB+Multimarcas+Cachoeira+de+Minas+MG&hl=pt-BR&z=15&output=embed"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização JB Multimarcas"
              ></iframe>
              <a
                className="map-open"
                href="https://www.google.com/maps/search/?api=1&query=JB+Multimarcas+Cachoeira+de+Minas+MG"
                target="_blank"
                rel="noreferrer"
              >
                <i className="fas fa-external-link-alt"></i> Abrir no Google Maps
              </a>
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
              <li>Júnior: (35) 99909-1119</li>
              <li>Bruno: (35) 99885-4358</li>
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

      <WaChooser />
    </div>
  );
}