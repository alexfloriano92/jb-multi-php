// ─── Cliente da API PHP (CodeIgniter 4 na Locaweb) ──────────
// Autenticação por sessão: o navegador manda o cookie `jb_session`
// automaticamente quando usamos `credentials: 'include'`.
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api";

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(msg: string, status: number, data: any) {
    super(msg); this.status = status; this.data = data;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: any; auth?: boolean; raw?: boolean };

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { body, auth: _auth = true, raw = false, headers, ...rest } = opts;
  const h = new Headers(headers);
  if (!raw && body !== undefined) h.set("Content-Type", "application/json");
  h.set("Accept", "application/json");
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers: h,
    body: raw ? (body as BodyInit) : (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText || "Erro na requisição";
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

// ─── Auth helpers ───────────────────────────────────────────
export type AuthUser = { id: number; name: string; email: string; role: "admin" | "user" };

export async function login(email: string, password: string) {
  const r = await api<{ user: AuthUser }>("/auth/login", {
    method: "POST", body: { email, password }, auth: false,
  });
  return r.user;
}
export async function logout() {
  try { await api("/auth/logout", { method: "POST" }); } catch { /* ignore */ }
}
export async function me(): Promise<AuthUser | null> {
  try { return await api<AuthUser>("/auth/me"); }
  catch { return null; }
}
