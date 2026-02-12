// src/api/mushroomTypeApi.ts
export type EdibilityCategory = "EDIBLE" | "CONDITIONALLY_EDIBLE" | "POISONOUS";

export interface MushroomType {
  id: number;
  name: string;
  latinName?: string;
  category?: EdibilityCategory;
  imageUrl?: string;
  description?: string;
}

export async function fetchMushroomTypes(): Promise<MushroomType[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/mushroom-types`
  );
  
  if (!res.ok) {
    throw new Error("Не удалось загрузить типы грибов");
  }
  
  return res.json();
}