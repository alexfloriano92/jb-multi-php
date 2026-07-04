// ─── Cliente da API PHP (Laravel na Locaweb) ────────────────
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api";
const TOKEN_KEY = "jb_token";

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else   localStorage.removeItem(TOKEN_KEY);
  } catch { /* noop */ }
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(msg: string, status: number, data: any) {
    super(msg); this.status = status; this.data = data;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: any; auth?: boolean; raw?: boolean };

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { body, auth = true, raw = false, headers, ...rest } = opts;
  const h = new Headers(headers);
  if (!raw && body !== undefined) h.set("Content-Type", "application/json");
  h.set("Accept", "application/json");
  if (auth) {
    const t = getToken();
    if (t) h.set("Authorization", `Bearer ${t}`);
  }
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
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
  const r = await api<{ token: string; user: AuthUser }>("/auth/login", {
    method: "POST", body: { email, password }, auth: false,
  });
  setToken(r.token);
  return r.user;
}
export async function logout() {
  try { await api("/auth/logout", { method: "POST" }); } catch { /* ignore */ }
  setToken(null);
}
export async function me(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  try { return await api<AuthUser>("/auth/me"); }
  catch (e: any) {
    if (e?.status === 401) setToken(null);
    return null;
  }
}
