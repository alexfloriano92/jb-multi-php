import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { carsQueryOptions } from "@/lib/cars";
import VehiclesCatalog from "@/components/VehiclesCatalog";
import WaChooser from "@/components/WaChooser";

export const Route = createFileRoute("/veiculos")({
  head: () => ({
    meta: [
      { title: "Todos os Veículos — JB Multimarcas" },
      { name: "description", content: "Confira todos os veículos disponíveis na JB Multimarcas: 0KM e seminovos com procedência, em Cachoeira de Minas - MG." },
      { property: "og:title", content: "Todos os Veículos — JB Multimarcas" },
      { property: "og:description", content: "Estoque completo da JB Multimarcas com busca e filtros por marca e categoria." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(carsQueryOptions),
  component: VeiculosPage,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, color: "#fff", background: "#080810", minHeight: "100vh" }}>
      Falha ao carregar o catálogo: {error.message}
    </div>
  ),
  notFoundComponent: () => <div style={{ padding: 40, color: "#fff" }}>Página não encontrada.</div>,
});

function VeiculosPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#080810" }} />}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const { data: cars } = useSuspenseQuery(carsQueryOptions);
  return (
    <div className="jb-app">
      <nav id="navbar" className="scrolled">
        <Link to="/" className="nav-logo">
          <img src="/assets/images/logo.png" alt="JB Multimarcas" className="nav-logo-img" />
        </Link>
        <ul className="nav-links">
          <li><Link to="/">← Voltar ao início</Link></li>
        </ul>
      </nav>

      <section id="catalogo" style={{ paddingTop: 120 }}>
        <div className="section-header fade-in-up visible">
          <div className="section-tag"><i className="fas fa-car"></i> Estoque completo</div>
          <h2 className="section-title">Todos os <span className="gold">Veículos</span></h2>
          <p className="section-subtitle">Use a busca e os filtros abaixo para encontrar o carro ideal.</p>
        </div>

        <VehiclesCatalog cars={cars} showFilters />
      </section>

      <div id="whatsapp-float">
        <a href="https://wa.me/5535999091119" target="_blank" rel="noreferrer" className="whatsapp-btn">
          <i className="fab fa-whatsapp"></i>
          <span className="btn-text">Falar no WhatsApp</span>
        </a>
      </div>

      <WaChooser />
    </div>
  );
}
