import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { login, me } from "@/lib/api";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Área Administrativa — JB Multimarcas" },
      { name: "description", content: "Acesso restrito ao painel administrativo da JB Multimarcas." },
      { property: "og:title", content: "Área Administrativa — JB Multimarcas" },
      { property: "og:description", content: "Acesso restrito ao painel administrativo da JB Multimarcas." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    me().then((u) => { if (u) navigate({ to: "/admin" }); });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate({ to: "/admin" });
    } catch (e: any) {
      setErr(e.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(ellipse at top, #14142a 0%, #080810 55%, #000 100%)",
      color: "#fff",
      padding: 24,
      fontFamily: "Inter, sans-serif",
    }}>
      <form onSubmit={onSubmit} style={{
        background: "rgba(19,19,31,0.85)",
        backdropFilter: "blur(12px)",
        padding: "48px 40px",
        borderRadius: 20,
        width: "100%",
        maxWidth: 440,
        border: "1px solid rgba(255,197,1,0.15)",
        boxShadow: "0 30px 80px -20px rgba(255,197,1,0.15), 0 0 0 1px rgba(255,255,255,0.03)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,197,1,0.12) 0%, transparent 70%)",
            marginBottom: 8,
          }}>
            <img src="/assets/images/logo.png" alt="JB Multimarcas" style={{ width: 150, height: "auto", filter: "drop-shadow(0 4px 24px rgba(255,197,1,0.3))" }} />
          </div>
          <h1 style={{ fontSize: 22, fontFamily: "Outfit, sans-serif", fontWeight: 600, letterSpacing: 0.5, marginTop: 8 }}>
            Painel Administrativo
          </h1>
          <p style={{ fontSize: 13, color: "#9aa0c0", marginTop: 6 }}>Acesso restrito à equipe JB</p>
        </div>
        <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#9aa0c0", textTransform: "uppercase", letterSpacing: 1 }}>E-mail</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 14, borderRadius: 10, background: "#0f0f1a", border: "1px solid #1e1e2e", color: "#fff", marginBottom: 18, fontSize: 14, outline: "none" }} />
        <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#9aa0c0", textTransform: "uppercase", letterSpacing: 1 }}>Senha</label>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 14, borderRadius: 10, background: "#0f0f1a", border: "1px solid #1e1e2e", color: "#fff", marginBottom: 20, fontSize: 14, outline: "none" }} />
        {err && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 14, padding: 10, background: "rgba(248,113,113,0.08)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)" }}>{err}</div>}
        <button type="submit" disabled={loading}
          style={{ width: "100%", padding: 14, borderRadius: 10, background: "linear-gradient(135deg,#FFC501 0%,#e5b100 100%)", color: "#000", fontWeight: 700, border: "none", cursor: loading ? "wait" : "pointer", fontSize: 14, letterSpacing: 0.5, boxShadow: "0 8px 24px -8px rgba(255,197,1,0.5)" }}>
          {loading ? "Autenticando..." : "Entrar no Painel"}
        </button>
        <a href="/" style={{ display: "block", textAlign: "center", marginTop: 20, color: "#6b7280", fontSize: 12, textDecoration: "none" }}>← Voltar ao site</a>
      </form>
    </div>
  );
}