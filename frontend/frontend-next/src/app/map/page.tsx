"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Place, PlaceImage, MushroomType } from "@/components/MapCluster";
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
  const [mushroomTypes, setMushroomTypes] = useState<MushroomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, logout } = useAuthStore();
  const router = useRouter();

  // Загрузка типов грибов - не требует авторизации
  useEffect(() => {
    const fetchMushroomTypes = async () => {
      try {
        const res = await api.get("/api/mushroom-types");
        setMushroomTypes(res.data);
      } catch (err) {
        console.error("Ошибка загрузки типов грибов:", err);
      }
    };

    fetchMushroomTypes();
  }, []);

  // 🆕 Загрузка мест - не требует авторизации (убран редирект при 401)
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
        // 🆕 Убран автоматический logout при 401 для публичного просмотра
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, []);

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

  // 🆕 Добавление места - требует авторизации
  const handlePlaceAdd = async (
    placeData: Omit<Place, "id" | "createdAt" | "ownerId" | "ownerUsername"> & {
      mushroomTypeId?: number;
    },
  ): Promise<Place> => {
    if (!token) {
      alert("Войдите в систему, чтобы добавлять места");
      router.push("/login");
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
          mushroomTypeId: placeData.mushroomTypeId,
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Карта грибных мест 🍄</h1>
        {/* 🆕 Кнопки авторизации для неавторизованных */}
        {!token && (
          <div className="flex gap-2">
            <a
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Войти
            </a>
            <a
              href="/register"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Регистрация
            </a>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="font-semibold">Ошибка загрузки</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
        <Map
          places={places}
          mushroomTypes={mushroomTypes}
          onAddPlace={handlePlaceAdd}
          onImageAdded={handleImageAdded}
          isLoading={isLoading}
        />
      </div>

      {/* 🆕 Описание для неавторизованных */}
      {!token && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h2 className="font-semibold text-green-800 mb-2">
            🍄 Добро пожаловать на карту грибных мест!
          </h2>
          <p className="text-green-700 text-sm">
            Просматривайте места сборов грибов, добавленные другими
            пользователями. Чтобы добавить свои находки и загружать фотографии,{" "}
            <a href="/login" className="underline font-medium">
              войдите в систему
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
