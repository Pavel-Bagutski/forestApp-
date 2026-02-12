// src/types/index.ts  
export interface PlaceImage {  
  id: number;  
  url: string;  
  uploadedAt?: string;  
}  
  
export interface MushroomType {  
  id: number;  
  name: string;  
  latinName?: string;  
  category?: string;  
  imageUrl?: string;  
  description?: string;  
}  
  
export interface Place {  
  id?: number;  
  title: string;  
  description?: string;  
  latitude: number;  
  longitude: number;  
  address?: string;  
  mushroomType?: MushroomType;  
  images?: PlaceImage[];  
  createdAt?: string;  
  ownerId?: number;  
  ownerUsername?: string;  
}  
  
export interface MapProps {  
  places: Place[];  
  mushroomTypes: MushroomType[];  
  onAddPlace: (data: Omit<Place, "id" | "createdAt" | "ownerId" | "ownerUsername"> & {  
    mushroomTypeId?: number;  
  }) => Promise<Place>;  
  onImageAdded: (placeId: number, image: PlaceImage) => void;  
  isLoading?: boolean;  
}