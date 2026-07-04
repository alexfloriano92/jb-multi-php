import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

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

export async function fetchCars(): Promise<Car[]> {
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Car[];
}

export const carsQueryOptions = queryOptions({
  queryKey: ["cars"],
  queryFn: fetchCars,
});

export function categoryLabel(c: string): string {
  if (c.includes("novo") && !c.includes("seminovo")) return "0KM";
  if (c.includes("seminovo")) return "Seminovo";
  if (c.includes("pickup")) return "Pickup";
  if (c.includes("suv")) return "SUV";
  return c;
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/5535999091119?text=${encodeURIComponent(text)}`;
}