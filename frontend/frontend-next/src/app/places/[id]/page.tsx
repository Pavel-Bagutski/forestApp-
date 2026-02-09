"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Place = {
  id: number;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  owner?: { email: string }; // если нужно показывать владельца
  images?: Array<{ url: string }>; // для будущих фото
  comments?: Array<{
    text: string;
    author: { email: string };
    createdAt: string;
  }>; // для комментариев
};

export default function PlacePage() {
  const { id } = useParams(); // id — это строка
  const router = useRouter();
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchPlace = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/places/${id}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError("Место не найдено");
          } else {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Ошибка сервера: ${res.status}`);
          }
          return;
        }

        const data = await res.json();
        setPlace(data);
      } catch (err: any) {
        setError(err.message || "Не удалось загрузить место");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlace();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Загрузка места...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-8 rounded-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-4">Ошибка</h2>
          <p>{error}</p>
          <button
            onClick={() => router.push("/map")}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            Вернуться к карте
          </button>
        </div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Место не найдено</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Заголовок */}
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{place.title}</h1>

      {/* Описание */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-3">Описание</h2>
        <p className="text-gray-700 whitespace-pre-line">
          {place.description || "Описание отсутствует"}
        </p>
      </div>

      {/* Координаты */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-3">Координаты</h2>
        <p className="text-gray-700">
          Широта: <strong>{place.latitude.toFixed(6)}</strong>
          <br />
          Долгота: <strong>{place.longitude.toFixed(6)}</strong>
        </p>
      </div>

      {/* Владелец (если нужно) */}
      {place.owner && (
        <div className="bg-gray-50 p-4 rounded-lg mb-8">
          <p className="text-sm text-gray-600">
            Добавлено пользователем: <strong>{place.owner.email}</strong>
          </p>
        </div>
      )}

      {/* Кнопка назад */}
      <button
        onClick={() => router.back()}
        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
      >
        ← Назад к карте
      </button>
    </div>
  );
}
