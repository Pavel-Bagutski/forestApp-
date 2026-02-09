"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { Place } from "@/components/Map";

// Динамический импорт, чтобы карта рендерилась только на клиенте
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function MapPage() {
  const [places, setPlaces] = useState<Place[]>([]);

  // Получаем все места с сервера при загрузке страницы
  useEffect(() => {
    axios
      .get("/api/places")
      .then((res) => {
        setPlaces(res.data);
      })
      .catch((err) => {
        console.error("Ошибка при загрузке мест:", err);
      });
  }, []);

  // Колбэк для добавления нового места
  const handlePlaceAdd = (place: Place) => {
    axios
      .post("/api/places", place)
      .then((res) => {
        setPlaces((prev) => [...prev, res.data]);
        alert("Место успешно добавлено!");
      })
      .catch((err) => {
        console.error("Ошибка при добавлении места:", err);
        alert("Не удалось добавить место");
      });
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Карта грибных мест 🍄</h1>
      <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
        <Map places={places} onPlaceAdd={handlePlaceAdd} />
      </div>
    </div>
  );
}
