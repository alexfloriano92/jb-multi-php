import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import JBHome from "@/components/JBHome";
import { carsQueryOptions } from "@/lib/cars";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JB Multimarcas | Veículos Novos e Seminovos em MG" },
      { name: "description", content: "Concessionária em Cachoeira de Minas - MG. Veículos novos e seminovos com procedência: compra, venda, troca e financiamento com atendimento próximo." },
      { property: "og:title", content: "JB Multimarcas | Veículos Novos e Seminovos em MG" },
      { property: "og:description", content: "Concessionária em Cachoeira de Minas - MG. Compra, venda, troca e financiamento de veículos novos e seminovos." },
      { property: "og:url", content: "https://connect-jb-spark.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://connect-jb-spark.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AutoDealer",
          name: "JB Multimarcas",
          url: "https://connect-jb-spark.lovable.app/",
          telephone: "+55 35 99909-1119",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Cachoeira de Minas",
            addressRegion: "MG",
            addressCountry: "BR",
          },
          sameAs: [
            "https://instagram.com/jb.multimarcaas",
            "https://wa.me/5535999091119",
          ],
        }),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(carsQueryOptions),
  component: Index,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, color: "#fff", background: "#080810", minHeight: "100vh" }}>
      Falha ao carregar o catálogo: {error.message}
    </div>
  ),
  notFoundComponent: () => <div style={{ padding: 40, color: "#fff" }}>Página não encontrada.</div>,
});

function Index() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#080810" }} />}>
      <JBHome />
    </Suspense>
  );
}
