"use client";

// ============================================
// ИМПОРТЫ
// ============================================

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { Place } from "@/components/Map";
import { useAuthStore } from "@/store/authStore";

// ============================================
// ДИНАМИЧЕСКИЙ ИМПОРТ КАРТЫ (без SSR)
// ============================================

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false, // 🆕 Отключаем серверный рендеринг для Leaflet
  loading: () => (
    // 🆕 Исправлено: h-150 → h-[600px] (валидный Tailwind)
    <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-bounce text-4xl mb-2">🍄</div>
        <p>Загрузка карты...</p>
      </div>
    </div>
  ),
});

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ: Страница карты
// ============================================

export default function MapPage() {
  // Состояния
  const [places, setPlaces] = useState<Place[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { token } = useAuthStore(); // Токен для авторизации

  // Защита от гидратации: ждём загрузки клиента
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Загрузка мест с сервера (только на клиенте)
  useEffect(() => {
    if (!isClient) return; // Не выполнять на сервере

    axios
      .get("http://localhost:8080/api/places")
      .then((res) => {
        setPlaces(res.data);
      })
      .catch((err) => {
        console.error("Ошибка при загрузке мест:", err);
      });
  }, [isClient]);

  // 🆕 Обработчик добавления места (с авторизацией)
  const handlePlaceAdd = async (place: Place) => {
    // Проверка авторизации
    if (!token) {
      alert("Войдите в систему");
      return;
    }

    try {
      const res = await axios.post("http://localhost:8080/api/places", place, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 🆕 Токен для авторизации
        },
      });

      // Добавляем новое место в список
      setPlaces((prev) => [...prev, res.data]);
      alert("Место успешно добавлено!");
    } catch (err) {
      console.error("Ошибка при добавлении места:", err);
      alert("Не удалось добавить место");
    }
  };

  // 🆕 Не рендерим на сервере (защита от гидратации)
  if (!isClient) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Карта грибных мест 🍄</h1>
        {/* 🆕 Исправлено: h-150 → h-[600px] */}
        <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-bounce text-4xl mb-2">🍄</div>
            <p>Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  // Основной рендер
  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Карта грибных мест 🍄</h1>
      <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
        {/* 🆕 Передаём places и onAddPlace */}
        <Map places={places} onAddPlace={handlePlaceAdd} />
      </div>
    </div>
  );
}
