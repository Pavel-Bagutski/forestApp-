"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Place, PlaceImage } from "@/components/Map";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

const Map = dynamic(() => import("@/components/Map").then((mod) => mod.Map), {
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.get("/api/places");
        setPlaces(res.data);
      } catch (err: any) {
        console.error("Ошибка при загрузке мест:", err);
        const errorMessage =
          err.response?.data?.message ||
          "Не удалось загрузить места. Проверьте подключение.";
        setError(errorMessage);

        if (err.response?.status === 401 || err.response?.status === 403) {
          logout();
          router.push("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, [logout, router]);

  const handleImageAdded = (placeId: number, image: PlaceImage) => {
    setPlaces((prev) =>
      prev.map((place) => {
        if (place.id === placeId) {
          return {
            ...place,
            images: [...(place.images || []), image],
          };
        }
        return place;
      }),
    );
  };

  const handlePlaceAdd = async (
    placeData: Omit<Place, "id" | "createdAt">,
  ): Promise<Place> => {
    if (!token) {
      alert("Войдите в систему");
      throw new Error("Нет токена авторизации");
    }

    try {
      const res = await api.post(
        "/api/places",
        {
          title: placeData.title,
          description: placeData.description,
          latitude: placeData.latitude,
          longitude: placeData.longitude,
          address: placeData.address,
          mushroomType: placeData.mushroomType, // 🆕 Добавлено поле mushroomType
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const newPlace: Place = res.data;
      setPlaces((prev) => [...prev, newPlace]);

      return newPlace;
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        alert("Сессия истекла. Пожалуйста, войдите снова");
        router.push("/login");
      }

      console.error("Ошибка при добавлении места:", err);
      const message =
        err.response?.data?.message || "Не удалось добавить место";
      alert("❌ Ошибка: " + message);
      throw err;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Карта грибных мест 🍄</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="font-semibold">Ошибка загрузки</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
        <Map
          places={places}
          onAddPlace={handlePlaceAdd}
          onImageAdded={handleImageAdded}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
