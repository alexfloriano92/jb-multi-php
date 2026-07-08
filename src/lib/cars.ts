import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";

export type Car = {
  id: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  price: number | null;
  color: string | null;
  fuel: string | null;
  transmission: string | null;
  category: string;
  image_url: string | null;
  images: string[];
  description: string | null;
  sold: boolean;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function safeImages(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function isCarLike(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && "id" in value && "brand" in value && "model" in value;
}

function normalize(c: Record<string, any>): Car {
  return {
    ...c,
    id: String(c.id),
    brand: String(c.brand ?? ""),
    model: String(c.model ?? ""),
    category: String(c.category ?? "seminovo"),
    color: typeof c.color === "string" ? c.color : null,
    fuel: typeof c.fuel === "string" ? c.fuel : null,
    transmission: typeof c.transmission === "string" ? c.transmission : null,
    image_url: typeof c.image_url === "string" ? c.image_url : null,
    description: typeof c.description === "string" ? c.description : null,
    created_at: typeof c.created_at === "string" ? c.created_at : "",
    updated_at: typeof c.updated_at === "string" ? c.updated_at : "",
    price: c.price !== null && c.price !== undefined ? Number(c.price) : null,
    year:  Number(c.year) || 0,
    km:    Number(c.km)   || 0,
    sort_order: Number(c.sort_order) || 0,
    sold:     !!c.sold,
    featured: !!c.featured,
    images: safeImages(c.images),
  };
}

function normalizePayload(data: unknown): Car[] {
  const payload = data && typeof data === "object" && "data" in data ? (data as { data: unknown }).data : data;
  if (Array.isArray(payload)) return payload.filter(isCarLike).map(normalize);
  if (isCarLike(payload)) return [normalize(payload)];
  return [];
}

export async function fetchCars(): Promise<Car[]> {
  try {
    const data = await api<unknown>("/cars", { auth: false });
    return normalizePayload(data);
  } catch (e) {
    // Backend PHP ainda não configurado / offline — não derruba o SSR.
    if (typeof console !== "undefined") console.warn("[cars] API indisponível:", (e as Error).message);
    return [];
  }
}

export async function createCar(payload: Partial<Car>): Promise<Car> {
  const c = await api<any>("/cars", { method: "POST", body: payload });
  return normalize(c);
}
export async function updateCar(id: string, payload: Partial<Car>): Promise<Car> {
  const c = await api<any>(`/cars/${id}`, { method: "PUT", body: payload });
  return normalize(c);
}
export async function deleteCar(id: string): Promise<void> {
  await api(`/cars/${id}`, { method: "DELETE" });
}

export async function uploadCarImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await api<{ url: string }>("/uploads/car", { method: "POST", body: fd, raw: true });
  return r.url;
}

export const carsQueryOptions = queryOptions({
  queryKey: ["cars"],
  queryFn: fetchCars,
  // Mantém os dados hidratados do SSR "frescos" por 5 minutos. Sem isso, o
  // `defaultPreloadStaleTime: 0` do router dispara um refetch imediato no
  // cliente; em preview / mobile o fetch cross-origin falha (CORS) e o
  // fallback `[]` de `fetchCars` sobrescreve os carros vindos do SSR,
  // deixando o catálogo em branco.
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
});

export function categoryLabel(c: string): string {
  if (c.includes("novo") && !c.includes("seminovo")) return "0KM";
  if (c.includes("seminovo")) return "Seminovo";
  if (c.includes("pickup"))   return "Pickup";
  if (c.includes("suv"))      return "SUV";
  return c;
}

export const SOCIOS = [
  { nome: "Júnior", fone: "5535999091119", inicial: "J", cor: "linear-gradient(135deg,#f4b942,#e8932a)" },
  { nome: "Bruno",  fone: "5535998854358", inicial: "B", cor: "linear-gradient(135deg,#7eb3ff,#5090e0)" },
] as const;

// Mantém href válido como fallback (Júnior). Todos os cliques em `a[href*="wa.me/"]`
// são interceptados pelo modal seletor de sócio.
export function whatsappUrl(text: string): string {
  return `https://wa.me/${SOCIOS[0].fone}?text=${encodeURIComponent(text)}`;
}

export function whatsappUrlFor(fone: string, text: string): string {
  return `https://wa.me/${fone}?text=${encodeURIComponent(text)}`;
}
