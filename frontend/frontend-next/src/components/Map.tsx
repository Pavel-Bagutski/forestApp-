"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { Icon, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuthStore } from "@/store/authStore";

// Типы
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

// Кастомная иконка маркера (больше размер)
const createCustomIcon = (isNew: boolean = false) => {
  return new DivIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${isNew ? "50px" : "40px"};
        height: ${isNew ? "50px" : "40px"};
        background: ${isNew ? "#ef4444" : "#22c55e"};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      ">
        <span style="transform: rotate(45deg);">🍄</span>
      </div>
    `,
    iconSize: [isNew ? 50 : 40, isNew ? 50 : 40],
    iconAnchor: [isNew ? 25 : 20, isNew ? 50 : 40],
    popupAnchor: [0, -40],
  });
};

// Компонент для добавления маркера
function LocationMarker({
  onAddPlace,
}: {
  onAddPlace: (place: Place) => void;
}) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    imageUrl: "",
  });

  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      // Сброс формы при новом клике
      setFormData({ title: "", description: "", address: "", imageUrl: "" });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) return;

    const place: Place = {
      title: formData.title,
      description: formData.description,
      latitude: position.lat,
      longitude: position.lng,
      address: formData.address,
      imageUrl: formData.imageUrl,
    };

    await onAddPlace(place);
    setPosition(null); // Закрыть форму после отправки
  };

  // Обработчик изменения полей с сохранением позиции
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!position) return null;

  return (
    <Marker
      position={position}
      icon={createCustomIcon(true)}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosition({ lat: pos.lat, lng: pos.lng });
        },
      }}
    >
      <Popup closeButton={false} autoClose={false}>
        <form onSubmit={handleSubmit} className="w-72 p-2">
          <h3 className="font-bold mb-2 text-lg">🍄 Новое место</h3>

          <input
            type="text"
            placeholder="Название места *"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            className="w-full border p-2 mb-2 rounded text-sm"
            required
          />

          <input
            type="text"
            placeholder="Область/Район/Адрес"
            value={formData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            className="w-full border p-2 mb-2 rounded text-sm"
          />

          <textarea
            placeholder="Описание (где растут грибы, как добраться...)"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className="w-full border p-2 mb-2 rounded text-sm h-20 resize-none"
          />

          <input
            type="url"
            placeholder="URL фотографии"
            value={formData.imageUrl}
            onChange={(e) => handleInputChange("imageUrl", e.target.value)}
            className="w-full border p-2 mb-2 rounded text-sm"
          />

          {formData.imageUrl && (
            <img
              src={formData.imageUrl}
              alt="Preview"
              className="w-full h-32 object-cover rounded mb-2"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700 text-sm font-medium"
            >
              ✅ Добавить
            </button>
            <button
              type="button"
              onClick={() => setPosition(null)}
              className="flex-1 bg-gray-300 p-2 rounded hover:bg-gray-400 text-sm"
            >
              Отмена
            </button>
          </div>
        </form>
      </Popup>
    </Marker>
  );
}

// Основной компонент карты
interface MapProps {
  onAddPlace?: (place: Place) => void;
  places?: Place[];
}

export default function Map({ onAddPlace, places: externalPlaces }: MapProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  // Загрузка мест при монтировании
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
        console.error("Ошибка загрузки мест:", err);
        setLoading(false);
      });
  }, [externalPlaces]);

  // Обработчик добавления места
  const handleAddPlace = useCallback(
    async (place: Place) => {
      if (!token) {
        alert("Пожалуйста, войдите в систему");
        return;
      }

      try {
        const res = await fetch("http://localhost:8080/api/places", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(place),
        });

        if (!res.ok) {
          const error = await res.text();
          throw new Error(error);
        }

        const savedPlace = await res.json();
        setPlaces((prev) => [...prev, savedPlace]);
        alert("✅ Место успешно добавлено!");
      } catch (err) {
        alert(
          "❌ Ошибка: " +
            (err instanceof Error ? err.message : "Не удалось сохранить"),
        );
      }
    },
    [token],
  );

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">🍄</div>
          <p>Загрузка карты...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <MapContainer
        center={[53.9, 27.5667]} // Минск по умолчанию
        zoom={7}
        className="h-[600px] w-full rounded-lg shadow-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Существующие места */}
        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={createCustomIcon(false)}
          >
            <Popup>
              <div className="max-w-xs">
                {place.imageUrl && (
                  <img
                    src={place.imageUrl}
                    alt={place.title}
                    className="w-full h-32 object-cover rounded mb-2"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
                <h3 className="font-bold text-lg mb-1">{place.title}</h3>
                {place.address && (
                  <p className="text-sm text-gray-600 mb-1">
                    📍 {place.address}
                  </p>
                )}
                <p className="text-sm text-gray-700">{place.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {place.createdAt &&
                    new Date(place.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Маркер для добавления нового места */}
        <LocationMarker onAddPlace={handleAddPlace} />
      </MapContainer>

      {/* Легенда */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-md z-[1000]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span className="text-sm">Грибные места</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span className="text-sm">Новое место</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Кликните на карту чтобы добавить
        </p>
      </div>
    </div>
  );
}
