"use client";

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

export interface PlaceImage {
  id: number;
  url: string;
  uploadedAt?: string;
}

export interface Place {
  id?: number;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  images?: PlaceImage[];
  createdAt?: string;
}

// ============================================
// ИКОНКИ
// ============================================

const createIcon = (color: string, size: number) =>
  new DivIcon({
    className: "custom-marker",
    html: `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
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
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 5)],
  });

const newPlaceIcon = createIcon("#ef4444", 50);
const existingPlaceIcon = createIcon("#22c55e", 40);

// ============================================
// КОМПОНЕНТ: Загрузка изображения (для существующего места)
// ============================================

const ImageUpload = memo(function ImageUpload({
  placeId,
  onUpload,
  token,
}: {
  placeId: number;
  onUpload: (image: PlaceImage) => void;
  token: string | null;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (!file.type.startsWith("image/")) {
      alert("Пожалуйста, выберите изображение");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой (максимум 5MB)");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `http://localhost:8080/api/places/${placeId}/images`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Ошибка загрузки");
      }

      const data = await res.json();
      onUpload({ id: data.id, url: data.url });
      alert("✅ Фото загружено!");
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="w-full py-2 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 transition"
      >
        {isUploading ? "⏳ Загрузка..." : "📷 Добавить фото"}
      </button>
      <p className="text-xs text-gray-400 text-center mt-1">JPG, PNG до 5MB</p>
    </div>
  );
});

// ============================================
// КОМПОНЕНТ: Форма в попапе (для НОВОГО места) С ЗАГРУЗКОЙ ФАЙЛА
// ============================================

const PopupForm = memo(function PopupForm({
  lat,
  lng,
  onSubmit,
  onCancel,
  token,
}: {
  lat: number;
  lng: number;
  onSubmit: (data: Omit<Place, "id" | "createdAt">) => Promise<Place>; // 🆕 Возвращает Promise с созданным местом
  onCancel: () => void;
  token: string | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // 🆕 Выбранный файл
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // 🆕 Превью
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 🆕 Состояние загрузки

  // Геокодирование при открытии
  useEffect(() => {
    setIsLoadingAddress(true);
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

  // 🆕 Обработка выбора файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Валидация
      if (!file.type.startsWith("image/")) {
        alert("Пожалуйста, выберите изображение");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Файл слишком большой (максимум 5MB)");
        return;
      }

      setSelectedFile(file);
      // Создаем превью
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 🆕 Удалить выбранный файл
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("Войдите в систему");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Создаем место
      const placeData = {
        title,
        description,
        address,
        latitude: lat,
        longitude: lng,
      };

      const createdPlace = await onSubmit(placeData);

      // 2. Если есть файл и место создано - загружаем фото
      if (selectedFile && createdPlace?.id) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch(
          `http://localhost:8080/api/places/${createdPlace.id}/images`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );

        if (!uploadRes.ok) {
          console.error("Не удалось загрузить фото, но место создано");
        } else {
          const uploadData = await uploadRes.json();
          console.log("Фото загружено:", uploadData.url);
        }
      }

      // Очищаем форму
      setTitle("");
      setDescription("");
      setAddress("");
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error("Ошибка при создании места:", err);
    } finally {
      setIsSubmitting(false);
    }
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
        disabled={isSubmitting}
      />

      <div className="relative mb-2">
        <input
          type="text"
          placeholder="Область/Район"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full border p-2 rounded text-sm pr-8"
          disabled={isLoadingAddress || isSubmitting}
        />
        {isLoadingAddress && <span className="absolute right-2 top-2">⏳</span>}
      </div>

      <textarea
        placeholder="Описание..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border p-2 mb-2 rounded text-sm h-20 resize-none"
        disabled={isSubmitting}
      />

      {/* 🆕 ЗАГРУЗКА ФАЙЛА ВМЕСТО URL */}
      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Фото:</label>

        {!selectedFile ? (
          <div className="relative">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP до 5MB</p>
          </div>
        ) : (
          <div className="relative">
            <img
              src={previewUrl || ""}
              alt="Preview"
              className="w-full h-24 object-cover rounded mb-2"
            />
            <button
              type="button"
              onClick={handleRemoveFile}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              disabled={isSubmitting}
            >
              ✕
            </button>
            <p className="text-xs text-green-600">✓ Фото выбрано</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title || isSubmitting}
          className="flex-1 bg-green-600 text-white p-2 rounded text-sm disabled:bg-gray-400 hover:bg-green-700 transition"
        >
          {isSubmitting ? "⏳ Сохранение..." : "✅ Добавить"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 bg-gray-300 p-2 rounded text-sm hover:bg-gray-400 transition"
        >
          Отмена
        </button>
      </div>
    </form>
  );
});

// ============================================
// КОМПОНЕНТ: Попап для СУЩЕСТВУЮЩЕГО места
// ============================================

const PlacePopup = memo(function PlacePopup({
  place,
  token,
  onImageAdded,
}: {
  place: Place;
  token: string | null;
  onImageAdded: (placeId: number, image: PlaceImage) => void;
}) {
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const images = place.images || [];
  const hasImages = images.length > 0;

  return (
    <div className="min-w-[250px] max-w-[300px]">
      {/* Галерея фото */}
      {hasImages && (
        <div className="mb-3">
          <img
            src={images[0].url}
            alt={place.title}
            className="w-full h-32 object-cover rounded-lg"
          />
          {images.length > 1 && !showAllPhotos && (
            <button
              onClick={() => setShowAllPhotos(true)}
              className="text-xs text-blue-600 mt-1 hover:underline"
            >
              +{images.length - 1} фото ещё
            </button>
          )}

          {showAllPhotos && images.length > 1 && (
            <div className="grid grid-cols-2 gap-1 mt-2">
              {images.slice(1).map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt="Фото места"
                  className="w-full h-20 object-cover rounded"
                />
              ))}
            </div>
          )}
        </div>
      )}

      <h3 className="font-bold text-lg">{place.title}</h3>

      {place.address && (
        <p className="text-sm text-gray-600 mt-1">📍 {place.address}</p>
      )}

      {place.description && (
        <p className="text-sm mt-2 text-gray-700">{place.description}</p>
      )}

      {/* Загрузка фото (только для авторизованных) */}
      {token && place.id && (
        <ImageUpload
          placeId={place.id}
          token={token}
          onUpload={(image) => onImageAdded(place.id!, image)}
        />
      )}
    </div>
  );
});

// ============================================
// КОМПОНЕНТ: Маркер нового места
// ============================================

const NewPlaceMarker = memo(function NewPlaceMarker({
  position,
  onSubmit,
  onCancel,
  token,
}: {
  position: { lat: number; lng: number };
  onSubmit: (data: Omit<Place, "id" | "createdAt">) => Promise<Place>;
  onCancel: () => void;
  token: string | null;
}) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    markerRef.current?.openPopup();
  }, []);

  return (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      icon={newPlaceIcon}
      draggable={false}
    >
      <Popup closeButton={true} autoClose={false} closeOnClick={false}>
        <PopupForm
          lat={position.lat}
          lng={position.lng}
          onSubmit={onSubmit}
          onCancel={onCancel}
          token={token}
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
  places?: Place[];
  onAddPlace?: (placeData: Omit<Place, "id" | "createdAt">) => Promise<Place>; // 🆕 Возвращает Promise<Place>
  onImageAdded?: (placeId: number, image: PlaceImage) => void;
  isLoading?: boolean;
}

export default function Map({
  places = [],
  onAddPlace,
  onImageAdded,
  isLoading = false,
}: MapProps) {
  const [newPosition, setNewPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const { token } = useAuthStore();

  const handlePositionChange = useCallback(
    (pos: { lat: number; lng: number }) => {
      if (!token) {
        alert("Войдите в систему, чтобы добавлять места");
        return;
      }
      setNewPosition(pos);
    },
    [token],
  );

  const handleSubmit = useCallback(
    async (data: Omit<Place, "id" | "createdAt">): Promise<Place> => {
      if (!onAddPlace) throw new Error("No onAddPlace handler");

      try {
        const createdPlace = await onAddPlace(data);
        setNewPosition(null);
        return createdPlace;
      } catch (err) {
        console.error("Ошибка при добавлении:", err);
        throw err;
      }
    },
    [onAddPlace],
  );

  const handleCancel = useCallback(() => {
    setNewPosition(null);
  }, []);

  const handleImageAdded = useCallback(
    (placeId: number, image: PlaceImage) => {
      if (onImageAdded) {
        onImageAdded(placeId, image);
      }
    },
    [onImageAdded],
  );

  if (isLoading) {
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
            icon={existingPlaceIcon}
          >
            <Popup>
              <PlacePopup
                place={place}
                token={token}
                onImageAdded={handleImageAdded}
              />
            </Popup>
          </Marker>
        ))}

        {/* Новое место */}
        {newPosition && (
          <NewPlaceMarker
            position={newPosition}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            token={token}
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
