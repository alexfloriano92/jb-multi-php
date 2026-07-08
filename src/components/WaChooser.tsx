import { useEffect, useState } from "react";
import { SOCIOS, whatsappUrlFor } from "@/lib/cars";

export default function WaChooser() {
  const [waText, setWaText] = useState<string | null>(null);

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const target = (ev.target as HTMLElement | null)?.closest?.('a[href*="wa.me/"]') as HTMLAnchorElement | null;
      if (!target) return;
      // Não intercepta cliques dentro do próprio modal (links dos sócios).
      if (target.closest("[data-wa-chooser]")) return;
      ev.preventDefault();
      let text = "Olá! Vim pelo site da JB Multimarcas e gostaria de mais informações.";
      try {
        const u = new URL(target.href);
        const t = u.searchParams.get("text");
        if (t) text = t;
      } catch { /* ignore */ }
      setWaText(text);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (waText === null) return null;

  return (
    <div
      onClick={() => setWaText(null)}
      style={{ position: "fixed", inset: 0, background: "rgba(4,4,10,0.88)", backdropFilter: "blur(10px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "Inter, sans-serif" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-wa-chooser
        style={{ background: "#0b0b14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, maxWidth: 400, width: "100%", color: "#fff", padding: "28px 24px", position: "relative", boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7)" }}
      >
        <button
          onClick={() => setWaText(null)}
          aria-label="Fechar"
          style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.55)", color: "#fff", cursor: "pointer", fontSize: 16 }}
        >×</button>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ color: "#25D366", fontSize: 34, marginBottom: 8 }}>
            <i className="fab fa-whatsapp"></i>
          </div>
          <h3 style={{ fontFamily: "Outfit, sans-serif", fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>
            Fale com a JB Multimarcas
          </h3>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0 }}>
            Escolha com qual sócio você quer conversar:
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SOCIOS.map((s) => (
            <a
              key={s.fone}
              href={whatsappUrlFor(s.fone, waText)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setTimeout(() => setWaText(null), 100)}
              style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px", textDecoration: "none", color: "#fff" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.cor, color: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: 18 }}>
                {s.inicial}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15 }}>Falar com {s.nome}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>
                  ({s.fone.slice(2, 4)}) {s.fone.slice(4, 9)}-{s.fone.slice(9)}
                </div>
              </div>
              <div style={{ color: "#25D366", fontSize: 22 }}>
                <i className="fab fa-whatsapp"></i>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
