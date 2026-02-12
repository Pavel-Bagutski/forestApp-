"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Place, MushroomType } from "@/components/map/Map";

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
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Получаем токен
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);

    // Загружаем данные
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Параллельная загрузка мест и типов грибов
        const [placesRes, typesRes] = await Promise.all([
          fetch("http://localhost:8080/api/places"),
          fetch("http://localhost:8080/api/mushroom-types"),
        ]);

        if (!placesRes.ok) throw new Error("Failed to fetch places");
        if (!typesRes.ok) throw new Error("Failed to fetch mushroom types");

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

  const handleAddPlace = async (placeData: Omit<Place, "id" | "createdAt">) => {
    console.log("Add place:", placeData);
    // TODO: отправить запрос на создание места
    // Пример:
    // const res = await fetch("http://localhost:8080/api/places", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${token}`,
    //   },
    //   body: JSON.stringify(placeData),
    // });
    // return res.json();

    // Временно возвращаем моковый Place
    return {
      id: Date.now(),
      ...placeData,
      createdAt: new Date().toISOString(),
    } as Place;
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
