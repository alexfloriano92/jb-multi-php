import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { me, logout as apiLogout } from "@/lib/api";
import {
  carsQueryOptions,
  createCar,
  updateCar,
  deleteCar,
  uploadCarImage,
  type Car,
} from "@/lib/cars";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel Admin — JB Multimarcas" },
      { name: "description", content: "Área restrita da equipe JB Multimarcas." },
      { property: "og:title", content: "Painel Admin — JB Multimarcas" },
      { property: "og:description", content: "Área restrita da equipe JB Multimarcas." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

type FormState = Partial<Car> & { id?: string };

const EMPTY: FormState = {
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  km: 0,
  price: null,
  color: "",
  fuel: "Flex",
  transmission: "Automático",
  category: "seminovo",
  image_url: "",
  images: [],
  description: "",
  sold: false,
  featured: false,
  sort_order: 0,
};

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const u = await me();
      if (!u) { navigate({ to: "/auth" }); return; }
      setUserEmail(u.email);
      setIsAdmin(u.role === "admin");
      setAuthChecked(true);
    })();
  }, [navigate]);

  const { data: cars = [], refetch } = useQuery({ ...carsQueryOptions, enabled: authChecked });

  async function signOut() {
    await apiLogout();
    navigate({ to: "/auth" });
  }

  function resetForm() {
    setForm(EMPTY);
    setEditing(null);
    setErr(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function editCar(c: Car) {
    setForm({ ...c });
    setEditing(c.id);
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleUpload(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const url = await uploadCarImage(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch (e: any) {
      setErr(e.message || "Falha ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  async function uploadOne(file: File): Promise<string> {
    return uploadCarImage(file);
  }

  async function handleGalleryUpload(files: FileList) {
    setErr(null);
    setGalleryUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadOne(file));
      }
      setForm((f) => ({ ...f, images: [...(f.images || []), ...urls] }));
    } catch (e: any) {
      setErr(e.message || "Falha ao enviar imagens");
    } finally {
      setGalleryUploading(false);
      if (galleryInput.current) galleryInput.current.value = "";
    }
  }

  function removeGalleryImage(idx: number) {
    setForm((f) => ({ ...f, images: (f.images || []).filter((_, i) => i !== idx) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const payload = {
        brand: form.brand!,
        model: form.model!,
        year: Number(form.year) || new Date().getFullYear(),
        km: Number(form.km) || 0,
        price: form.price ? Number(form.price) : null,
        color: form.color || null,
        fuel: form.fuel || null,
        transmission: form.transmission || null,
        category: form.category || "seminovo",
        image_url: form.image_url || null,
        images: form.images || [],
        description: form.description || null,
        sold: !!form.sold,
        featured: !!form.featured,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) {
        await updateCar(editing, payload);
      } else {
        await createCar(payload);
      }
      resetForm();
      await refetch();
      qc.invalidateQueries({ queryKey: ["cars"] });
    } catch (e: any) {
      setErr(e.message || "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este veículo?")) return;
    try {
      await deleteCar(id);
      await refetch();
      qc.invalidateQueries({ queryKey: ["cars"] });
    } catch (e: any) { alert(e.message); }
  }

  async function toggle(id: string, field: "sold" | "featured", value: boolean) {
    const patch = field === "sold" ? { sold: value } : { featured: value };
    try {
      await updateCar(id, patch);
      await refetch();
      qc.invalidateQueries({ queryKey: ["cars"] });
    } catch (e: any) { alert(e.message); }
  }

  if (!authChecked) {
    return <div style={{ minHeight: "100vh", background: "#080810", color: "#fff", padding: 40 }}>Verificando acesso…</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "#080810", color: "#fff", padding: 40, textAlign: "center" }}>
        <h1 style={{ fontFamily: "Outfit", fontSize: 28, marginBottom: 12 }}>Acesso restrito</h1>
        <p style={{ color: "#9aa0c0", marginBottom: 24 }}>
          Você está logado como <strong>{userEmail}</strong>, mas ainda não tem permissão de administrador.
        </p>
        <button onClick={signOut} style={{ padding: "10px 20px", background: "#FFC501", color: "#000", fontWeight: 700, border: "none", borderRadius: 8, cursor: "pointer" }}>Sair</button>
      </div>
    );
  }

  const S = {
    input: { width: "100%", padding: 10, borderRadius: 8, background: "#0f0f1a", border: "1px solid #1e1e2e", color: "#fff", fontSize: 14 } as React.CSSProperties,
    label: { display: "block", fontSize: 12, color: "#9aa0c0", marginBottom: 4, marginTop: 10 } as React.CSSProperties,
    btn: { padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 } as React.CSSProperties,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "#fff", padding: "24px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src="/assets/images/logo.png" alt="JB" style={{ height: 48 }} />
            <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 24 }}>Painel Admin</h1>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a href="/" style={{ color: "#9aa0c0", textDecoration: "none" }}>← Ver site</a>
            <span style={{ color: "#9aa0c0", fontSize: 13 }}>{userEmail}</span>
            <button onClick={signOut} style={{ ...S.btn, background: "#1e1e2e", color: "#fff" }}>Sair</button>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,460px) 1fr", gap: 24, alignItems: "start" }}>
          {/* Form */}
          <form onSubmit={save} style={{ background: "#13131f", padding: 24, borderRadius: 16, border: "1px solid #1e1e2e", position: "sticky", top: 24 }}>
            <h2 style={{ fontFamily: "Outfit, sans-serif", fontSize: 18, marginBottom: 8 }}>
              {editing ? "Editar veículo" : "Novo veículo"}
            </h2>

            {/* Image uploader */}
            <div style={{ marginTop: 12, marginBottom: 8 }}>
              <label style={{ ...S.label, marginTop: 0 }}>Foto do veículo</label>
              <div
                onClick={() => fileInput.current?.click()}
                style={{
                  border: "2px dashed #1e1e2e",
                  borderRadius: 12,
                  padding: form.image_url ? 8 : 24,
                  textAlign: "center",
                  cursor: "pointer",
                  background: "#0f0f1a",
                  transition: "border-color .2s",
                  minHeight: 140,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {form.image_url ? (
                  <>
                    <img src={form.image_url} alt="Prévia" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 8, objectFit: "cover" }} />
                    <div style={{ marginTop: 8, fontSize: 12, color: "#9aa0c0" }}>Clique para trocar a imagem</div>
                  </>
                ) : uploading ? (
                  <div style={{ color: "#FFC501", fontSize: 13 }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Enviando...
                  </div>
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: 32, color: "#FFC501", marginBottom: 8 }}></i>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Clique para enviar uma foto</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>JPG, PNG ou WEBP</div>
                  </>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              {form.image_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image_url: "" })}
                  style={{ ...S.btn, background: "transparent", color: "#f87171", padding: "6px 0", fontSize: 12, marginTop: 6 }}
                >
                  Remover imagem
                </button>
              )}
            </div>

            {/* Additional photos gallery */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ ...S.label, marginTop: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Fotos adicionais ({(form.images || []).length})</span>
                <button
                  type="button"
                  onClick={() => galleryInput.current?.click()}
                  disabled={galleryUploading}
                  style={{ ...S.btn, background: "#1e1e2e", color: "#FFC501", padding: "6px 10px", fontSize: 11 }}
                >
                  {galleryUploading ? "Enviando..." : "+ Adicionar fotos"}
                </button>
              </label>
              <input
                ref={galleryInput}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length) handleGalleryUpload(files);
                }}
              />
              {(form.images || []).length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 6 }}>
                  {(form.images || []).map((url, idx) => (
                    <div key={idx} style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 8, overflow: "hidden", background: "#0f0f1a", border: "1px solid #1e1e2e" }}>
                      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        title="Remover"
                        style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.7)", color: "#fff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                A "Foto do veículo" acima é a capa. As fotos adicionais aparecem na galeria quando o cliente abrir o carro.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={S.label}>Marca *</label>
                <input required style={S.input} value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Modelo *</label>
                <input required style={S.input} value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Ano *</label>
                <input type="number" required style={S.input} value={form.year || ""} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
              </div>
              <div>
                <label style={S.label}>Km</label>
                <input type="number" style={S.input} value={form.km ?? 0} onChange={(e) => setForm({ ...form, km: Number(e.target.value) })} />
              </div>
              <div>
                <label style={S.label}>Preço (R$)</label>
                <input type="number" step="0.01" style={S.input} value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <label style={S.label}>Cor</label>
                <input style={S.input} value={form.color || ""} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Combustível</label>
                <select style={S.input} value={form.fuel || ""} onChange={(e) => setForm({ ...form, fuel: e.target.value })}>
                  <option>Flex</option><option>Gasolina</option><option>Diesel</option><option>Etanol</option><option>Elétrico</option><option>Híbrido</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Câmbio</label>
                <select style={S.input} value={form.transmission || ""} onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
                  <option>Manual</option><option>Automático</option><option>CVT</option><option>Automatizado</option>
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={S.label}>Categoria (novo, seminovo, suv, pickup — separadas por espaço)</label>
                <input style={S.input} value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={S.label}>Descrição</label>
                <textarea rows={3} style={S.input} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Ordem</label>
                <input type="number" style={S.input} value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Destaque
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input type="checkbox" checked={!!form.sold} onChange={(e) => setForm({ ...form, sold: e.target.checked })} /> Vendido
                </label>
              </div>
            </div>
            {err && <div style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>{err}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button type="submit" disabled={busy || uploading} style={{ ...S.btn, flex: 1, background: "#FFC501", color: "#000" }}>
                {busy ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar veículo"}
              </button>
              {editing && (
                <button type="button" onClick={resetForm} style={{ ...S.btn, background: "#1e1e2e", color: "#fff" }}>Cancelar</button>
              )}
            </div>
          </form>

          {/* List */}
          <div>
            <h2 style={{ fontFamily: "Outfit, sans-serif", fontSize: 18, marginBottom: 12 }}>Veículos cadastrados ({cars.length})</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {cars.map((c) => (
                <div key={c.id} style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 12, padding: 16, display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 16, alignItems: "center", opacity: c.sold ? 0.6 : 1 }}>
                  <div style={{ width: 80, height: 60, borderRadius: 8, overflow: "hidden", background: "#0f0f1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.image_url ? <img src={c.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <i className="fas fa-car" style={{ color: "#333", fontSize: 24 }}></i>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {c.brand} {c.model} <span style={{ color: "#9aa0c0", fontWeight: 400 }}>· {c.year}</span>
                    </div>
                    <div style={{ color: "#9aa0c0", fontSize: 13, marginTop: 4 }}>
                      {c.km.toLocaleString("pt-BR")} km · {c.category} {c.price ? `· R$ ${Number(c.price).toLocaleString("pt-BR")}` : ""}
                      {c.featured && <span style={{ color: "#FFC501", marginLeft: 8 }}>★ destaque</span>}
                      {c.sold && <span style={{ color: "#f87171", marginLeft: 8 }}>vendido</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button onClick={() => toggle(c.id, "featured", !c.featured)} style={{ ...S.btn, background: c.featured ? "#FFC501" : "#1e1e2e", color: c.featured ? "#000" : "#fff" }}>★</button>
                    <button onClick={() => toggle(c.id, "sold", !c.sold)} style={{ ...S.btn, background: c.sold ? "#f87171" : "#1e1e2e", color: "#fff" }}>{c.sold ? "Reativar" : "Vendido"}</button>
                    <button onClick={() => editCar(c)} style={{ ...S.btn, background: "#1e1e2e", color: "#fff" }}>Editar</button>
                    <button onClick={() => remove(c.id)} style={{ ...S.btn, background: "#7a1e1e", color: "#fff" }}>Excluir</button>
                  </div>
                </div>
              ))}
              {cars.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#9aa0c0" }}>Nenhum veículo cadastrado.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}