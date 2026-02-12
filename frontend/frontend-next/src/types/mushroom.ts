// ============================================
// ПЕРЕЭКСПОРТ: Делаем MushroomType доступным из types/index.ts
// ============================================
export type { MushroomType } from "../api/mushroomTypeApi";

// ============================================
// ОСТАЛЬНЫЕ ТИПЫ
// ============================================

import type { MushroomType as MT } from "../api/mushroomTypeApi";
// В Map.tsx, MapCluster.tsx, map/page.tsx  
import { MushroomType, Place, PlaceImage } from "@/types/mushroom";

export interface PlaceImage {
  id: number;
  url: string;
  uploadedAt?: string;
}

export interface Place {
  id?: number;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  mushroomType?: MT; // Используем алиас
  images?: PlaceImage[];
  createdAt?: string;
  ownerId?: number;
  ownerUsername?: string;
}

export type PlaceFormData = Omit<Place, "id" | "createdAt" | "ownerId" | "ownerUsername"> & {
  mushroomTypeId?: number;
};

export interface MapProps {
  places: Place[];
  mushroomTypes: MT[]; // Используем алиас
  onAddPlace: (data: PlaceFormData) => Promise<Place>;
  onImageAdded: (placeId: number, image: PlaceImage) => void;
  isLoading?: boolean;
}