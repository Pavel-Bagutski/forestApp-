"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/axios"; // 🆕 Заменили axios на api
import { Place, PlaceImage } from "@/components/Map";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation"; // 🆕 Добавили router

const Map = dynamic(() => import("@/components/Map"), {
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
  const [isClient, setIsClient] = useState(false);
  const { token, logout } = useAuthStore(); // 🆕 Добавили logout
  const router = useRouter(); // 🆕 Добавили router

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const fetchPlaces = async () => {
      try {
        setIsLoading(true);
        const res = await api.get("/api/places"); // 🆕 Используем api вместо axios
        setPlaces(res.data);
      } catch (err) {
        console.error("Ошибка при загрузке мест:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, [isClient]);

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
        // 🆕 Используем api вместо axios
        "/api/places", // 🆕 Убрали полный URL
        {
          title: placeData.title,
          description: placeData.description,
          latitude: placeData.latitude,
          longitude: placeData.longitude,
          address: placeData.address,
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
      // 🆕 Обработка истекшего токена
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

  if (!isClient) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Карта грибных мест 🍄</h1>
        <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-bounce text-4xl mb-2">🍄</div>
            <p>Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Карта грибных мест 🍄</h1>
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
