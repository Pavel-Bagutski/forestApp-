"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Place, MushroomType } from "@/components/map/Map";
import { useAuthStore } from "@/store/authStore";

// Типизируем динамический импорт
const Map = dynamic(
  () => import("@/components/map/Map").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Загрузка карты...</p>
      </div>
    ),
  },
);

export default function MapPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [mushroomTypes, setMushroomTypes] = useState<MushroomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {

    // Загружаем данные
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Параллельная загрузка мест и типов грибов
        const [placesRes, typesRes] = await Promise.all([
          fetch("http://localhost:8080/api/places"),
          fetch("http://localhost:8080/api/mushroom-types"),
        ]);

        if (!placesRes.ok) {
          const errorText = await placesRes.text();
          console.error("Places fetch error:", placesRes.status, errorText);
          throw new Error(`Failed to fetch places: ${placesRes.status} ${errorText}`);
        }
        if (!typesRes.ok) {
          const errorText = await typesRes.text();
          console.error("Types fetch error:", typesRes.status, errorText);
          throw new Error("Failed to fetch mushroom types");
        }

        const placesData = await placesRes.json();
        const typesData = await typesRes.json();

        setPlaces(placesData);
        setMushroomTypes(typesData);
      } catch (err) {
        console.error(err);
        setError("Ошибка загрузки данных");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Функция для декодирования JWT (для отладки)
  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const handleAddPlace = async (placeData: Omit<Place, "id" | "createdAt" | "images" | "mushroomTypes"> & { 
    images?: File[];
    mushroomTypeIds: number[];
    newMushroomTypes: { name: string; category?: string }[];
  }) => {
    console.log("Add place:", placeData);
    
    // Проверяем наличие токена
    if (!token) {
      setError("Требуется авторизация");
      throw new Error("No token available");
    }
    
    // Отладка: декодируем и показываем содержимое токена
    const decodedToken = decodeJWT(token);
    console.log("Decoded JWT:", decodedToken);
    console.log("Roles in token:", decodedToken?.roles || decodedToken?.authorities || decodedToken?.role || "No roles found");
    
    const { images, mushroomTypeIds, newMushroomTypes, ...placeInfo } = placeData;
    
    // Бэкенд ожидает JSON с одним mushroomTypeId
    // Берём первый выбранный гриб или null
    const mushroomTypeId = mushroomTypeIds.length > 0 ? mushroomTypeIds[0] : null;
    
    const requestBody = {
      title: placeInfo.title,
      description: placeInfo.description || "",
      latitude: placeInfo.latitude,
      longitude: placeInfo.longitude,
      address: null,
      imageUrl: null,
      mushroomTypeId: mushroomTypeId,
    };

    try {
      const res = await fetch("http://localhost:8080/api/places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server error:", res.status, errorText);
        throw new Error(`Failed to create place: ${res.status} ${errorText}`);
      }

      const newPlace = await res.json();
      
      // Загружаем фотографии по одной (множественная загрузка)
      if (images && images.length > 0 && newPlace.id) {
        const uploadResults = [];
        for (const image of images) {
          const imageFormData = new FormData();
          imageFormData.append("file", image);
          
          try {
            const imgRes = await fetch(`http://localhost:8080/api/places/${newPlace.id}/images`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: imageFormData,
            });
            
            if (imgRes.ok) {
              const imgData = await imgRes.json();
              uploadResults.push({ success: true, data: imgData });
              console.log("✅ Фото загружено:", imgData.url);
            } else {
              const errorText = await imgRes.text();
              uploadResults.push({ success: false, error: errorText });
              console.error("❌ Ошибка загрузки фото:", imgRes.status, errorText);
            }
          } catch (imgErr: any) {
            uploadResults.push({ success: false, error: imgErr.message });
            console.error("❌ Ошибка сети при загрузке фото:", imgErr);
          }
        }
        
        // Показываем результат загрузки
        const successCount = uploadResults.filter(r => r.success).length;
        if (successCount > 0) {
          console.log(`✅ Загружено ${successCount} из ${images.length} фото`);
        }
      }
      
      // Обновляем список мест
      setPlaces((prev) => [...prev, newPlace]);
      
      return newPlace;
    } catch (err) {
      console.error("Failed to add place:", err);
      setError("Ошибка при создании места");
      throw err;
    }
  };

  const handleImageAdded = (
    placeId: number,
    image: import("@/components/map/Map").PlaceImage,
  ) => {
    console.log("Image added for place:", placeId, image);
    // Обновляем список мест, добавляя новое изображение
    setPlaces((prev) =>
      prev.map((place) =>
        place.id === placeId
          ? { ...place, images: [...(place.images || []), image] }
          : place,
      ),
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Карта грибных мест</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="w-full flex justify-center">
        <Map
          places={places}
          mushroomTypes={mushroomTypes}
          onAddPlace={handleAddPlace}
          onImageAdded={handleImageAdded}
          isLoading={isLoading}
        />
      </div>

      {!token && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg text-center">
          <p>
            🔒{" "}
            <a href="/login" className="text-blue-600 underline">
              Войдите
            </a>
            , чтобы добавлять места
          </p>
        </div>
      )}
    </div>
  );
}
