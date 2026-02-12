// Типы для карты
export interface Place {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  description?: string;
  address?: string;
  userId?: number;
  images?: PlaceImage[];
  mushroomTypes?: MushroomType[];
  createdAt?: string;
}

export interface PlaceImage {
  id: number;
  url: string;
  uploadedAt?: string;
}

export interface MushroomType {
  id: number;
  name: string;
  icon?: string;
  color?: string;
}

// Пропсы для компонента Map
export interface MapProps {
  places: Place[];
  mushroomTypes: MushroomType[];
  onAddPlace: (data: any) => Promise<Place>;
  onImageAdded: (placeId: number, image: PlaceImage) => void;
  isLoading: boolean;
}