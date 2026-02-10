"use client";

// ============================================
// ИМПОРТЫ
// ============================================

import { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuthStore } from "@/store/authStore";

// ============================================
// ТИПЫ
// ============================================

export interface Place {
  id?: number;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  imageUrl?: string;
  createdAt?: string;
}

// ============================================
// ИКОНКИ (создаются ОДИН РАЗ)
// ============================================

// 🔴 Красная иконка 50px для НОВОГО места
const newPlaceIcon = new DivIcon({
  className: "custom-marker",
  html: `
    <div style="
      width: 50px;
      height: 50px;
      background: #ef4444;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
    ">
      <span style="transform: rotate(45deg);">🍄</span>
    </div>
  `,
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -55],
});

// 🟢 Зелёная иконка 40px для существующих мест
const existingPlaceIcon = new DivIcon({
  className: "custom-marker",
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background: #22c55e;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
    ">
      <span style="transform: rotate(45deg);">🍄</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -45],
});

// ============================================
// КОМПОНЕНТ: Форма в попапе (изолирована от маркера)
// ============================================

const PopupForm = memo(function PopupForm({
  lat,
  lng,
  onSubmit,
  onCancel,
}: {
  lat: number;
  lng: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  // Состояния полей формы (изолированы от маркера!)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Геокодирование при открытии
  useEffect(() => {
    setIsLoadingAddress(true);
    // 🆕 Исправлено: убран пробел в URL
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.display_name) {
          const parts = data.display_name
            .split(",")
            .map((s: string) => s.trim());
          const region = parts.find((p: string) => p.includes("область"));
          const district = parts.find((p: string) => p.includes("район"));
          const city = parts.find(
            (p: string) =>
              p.includes("город") ||
              p.includes("посёлок") ||
              p.includes("агрогородок"),
          );

          const formatted = [region, district, city]
            .filter(Boolean)
            .slice(0, 3)
            .join(", ");

          setAddress(formatted || parts.slice(0, 2).join(", "));
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingAddress(false));
  }, [lat, lng]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, description, address, imageUrl, lat, lng });
  };

  return (
    <form onSubmit={handleSubmit} className="w-72 p-2">
      <h3 className="font-bold mb-3 text-lg">🍄 Новое место</h3>

      <input
        type="text"
        placeholder="Название места *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-2 mb-2 rounded text-sm"
        required
      />

      <div className="relative mb-2">
        <input
          type="text"
          placeholder="Область/Район"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full border p-2 rounded text-sm pr-8"
          disabled={isLoadingAddress}
        />
        {isLoadingAddress && <span className="absolute right-2 top-2">⏳</span>}
      </div>

      <textarea
        placeholder="Описание..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border p-2 mb-2 rounded text-sm h-20 resize-none"
      />

      <input
        type="url"
        placeholder="URL фото"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        className="w-full border p-2 mb-2 rounded text-sm"
      />

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Preview"
          className="w-full h-24 object-cover rounded mb-2"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title}
          className="flex-1 bg-green-600 text-white p-2 rounded text-sm disabled:bg-gray-400"
        >
          ✅ Добавить
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-300 p-2 rounded text-sm"
        >
          Отмена
        </button>
      </div>
    </form>
  );
});

// ============================================
// КОМПОНЕНТ: Маркер нового места (стабильный)
// ============================================

const NewPlaceMarker = memo(function NewPlaceMarker({
  position,
  onSubmit,
  onCancel,
}: {
  position: { lat: number; lng: number };
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const markerRef = useRef<any>(null);

  // Автооткрытие попапа
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.openPopup();
    }
  }, []);

  return (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      icon={newPlaceIcon} // 🆕 Стабильная иконка (не пересоздаётся)
      draggable={false}
      key="new-place-marker" // 🆕 Фиксированный ключ
    >
      <Popup closeButton={true} autoClose={false} closeOnClick={false}>
        <PopupForm
          lat={position.lat}
          lng={position.lng}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </Popup>
    </Marker>
  );
});

// ============================================
// КОМПОНЕНТ: Обработчик кликов по карте
// ============================================

function MapClickHandler({
  onPositionChange,
}: {
  onPositionChange: (pos: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
    },
  });
  return null;
}

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ: Map
// ============================================

interface MapProps {
  onAddPlace?: (place: Place) => void;
  places?: Place[];
}

export default function Map({ onAddPlace, places: externalPlaces }: MapProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPosition, setNewPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const { token } = useAuthStore();

  // Загрузка мест
  useEffect(() => {
    if (externalPlaces) {
      setPlaces(externalPlaces);
      setLoading(false);
      return;
    }

    fetch("http://localhost:8080/api/places")
      .then((res) => res.json())
      .then((data) => {
        setPlaces(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка:", err);
        setLoading(false);
      });
  }, [externalPlaces]);

  // Обработчики (стабильные благодаря useCallback)
  const handlePositionChange = useCallback(
    (pos: { lat: number; lng: number }) => {
      setNewPosition(pos);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (data: any) => {
      if (!token) {
        alert("Войдите в систему");
        return;
      }

      try {
        const res = await fetch("http://localhost:8080/api/places", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            latitude: data.lat,
            longitude: data.lng,
            address: data.address,
            imageUrl: data.imageUrl,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText);
        }

        const savedPlace: Place = await res.json();
        setPlaces((prev) => [...prev, savedPlace]);
        setNewPosition(null);

        if (onAddPlace) onAddPlace(savedPlace);

        alert("✅ Добавлено!");
      } catch (err) {
        alert(
          "❌ Ошибка: " +
            (err instanceof Error ? err.message : "Не удалось сохранить"),
        );
      }
    },
    [token, onAddPlace],
  );

  const handleCancel = useCallback(() => {
    setNewPosition(null);
  }, []);

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">🍄</div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <MapContainer
        center={[53.9, 27.5667]}
        zoom={7}
        className="h-[600px] w-full rounded-lg"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Существующие места */}
        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={existingPlaceIcon} // 🆕 Стабильная иконка
          >
            <Popup>
              <div>
                {place.imageUrl && (
                  <img
                    src={place.imageUrl}
                    alt={place.title}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                <h3 className="font-bold">{place.title}</h3>
                {place.address && <p>📍 {place.address}</p>}
                <p className="text-sm text-gray-600">{place.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Новое место */}
        {newPosition && (
          <NewPlaceMarker
            position={newPosition}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}

        <MapClickHandler onPositionChange={handlePositionChange} />
      </MapContainer>

      {/* Легенда */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-md z-[1000] text-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span>Грибные места</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span>Новое место</span>
        </div>
      </div>
    </div>
  );
}
