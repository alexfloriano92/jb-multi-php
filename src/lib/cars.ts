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

function normalize(c: any): Car {
  return {
    ...c,
    price: c.price !== null && c.price !== undefined ? Number(c.price) : null,
    year:  Number(c.year) || 0,
    km:    Number(c.km)   || 0,
    sort_order: Number(c.sort_order) || 0,
    sold:     !!c.sold,
    featured: !!c.featured,
    images: Array.isArray(c.images) ? c.images : (c.images ? JSON.parse(c.images) : []),
  };
}

export async function fetchCars(): Promise<Car[]> {
  try {
    const data = await api<any[]>("/cars", { auth: false });
    return (data ?? []).map(normalize);
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
});

export function categoryLabel(c: string): string {
  if (c.includes("novo") && !c.includes("seminovo")) return "0KM";
  if (c.includes("seminovo")) return "Seminovo";
  if (c.includes("pickup"))   return "Pickup";
  if (c.includes("suv"))      return "SUV";
  return c;
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/5535999091119?text=${encodeURIComponent(text)}`;
}
