"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import type { Place, PlaceImage, MushroomType } from "@/types";

// Динамический импорт карты (без SSR)
const Map = dynamic(() => import("@/components/map/Map").then((m) => m.Map), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-bounce text-4xl mb-2">🍄</div>
        <p>Загрузка карты...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [mushroomTypes, setMushroomTypes] = useState<MushroomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { token, logout } = useAuthStore();
  const router = useRouter();

  // Загрузка типов грибов
  useEffect(() => {
    api
      .get("/api/mushroom-types")
      .then((res) => setMushroomTypes(res.data))
      .catch(console.error);
  }, []);

  // Загрузка мест (публичная)
  useEffect(() => {
    setIsLoading(true);
    api
      .get("/api/places")
      .then((res) => setPlaces(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  // Добавление места (требует авторизации)
  const handleAddPlace = async (data: any): Promise<Place> => {
    if (!token) {
      router.push("/login");
      throw new Error("Нет авторизации");
    }

    const res = await api.post("/api/places", data, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const newPlace = res.data;
    setPlaces((prev) => [...prev, newPlace]);
    return newPlace;
  };

  // Добавление фото к существующему месту
  const handleImageAdded = (placeId: number, image: PlaceImage) => {
    setPlaces((prev) =>
      prev.map((p) =>
        p.id === placeId ? { ...p, images: [...(p.images || []), image] } : p,
      ),
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Карта грибных мест 🍄</h1>
        {!token && (
          <div className="flex gap-2">
            <a
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Войти
            </a>
            <a
              href="/register"
              className="px-4 py-2 bg-green-600 text-white rounded-lg"
            >
              Регистрация
            </a>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <Map
        places={places}
        mushroomTypes={mushroomTypes}
        onAddPlace={handleAddPlace}
        onImageAdded={handleImageAdded}
        isLoading={isLoading}
      />

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
