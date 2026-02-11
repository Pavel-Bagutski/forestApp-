"use client";

import { useState, useEffect, useRef, memo } from "react";
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
import { MapCluster, Place, PlaceImage } from "./MapCluster";

// ============================================
// ИКОНКИ
// ============================================

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

// ============================================
// КОМПОНЕНТ: Загрузка изображения
// ============================================

export const ImageUpload = memo(function ImageUpload({
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !token) return;

    setIsUploading(true);

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name}: Пожалуйста, выберите изображение`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}: Файл слишком большой (максимум 5MB)`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/places/${placeId}/images`,
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
      } catch (err: any) {
        console.error(`Upload error for ${file.name}:`, err);
        alert(`❌ ${file.name}: ${err.message || "Ошибка загрузки"}`);
      }
    }

    alert("✅ Фото загружены!");
    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        multiple
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
// КОМПОНЕНТ: Форма в попапе
// ============================================

const PopupForm = memo(function PopupForm({
  lat,
  lng,
  onSubmit,
  onCancel,
  token,
  onImageAdded,
}: {
  lat: number;
  lng: number;
  onSubmit: (data: Omit<Place, "id" | "createdAt">) => Promise<Place>;
  onCancel: () => void;
  token: string | null;
  onImageAdded?: (placeId: number, image: PlaceImage) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [mushroomType, setMushroomType] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name}: Пожалуйста, выберите изображение`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}: Файл слишком большой (максимум 5MB)`);
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("Войдите в систему");
      return;
    }

    setIsSubmitting(true);

    try {
      const placeData = {
        title,
        description,
        address,
        latitude: lat,
        longitude: lng,
        mushroomType,
      };

      const createdPlace = await onSubmit(placeData);

      if (selectedFiles.length > 0 && createdPlace?.id) {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append("file", file);

          try {
            const uploadRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/places/${createdPlace.id}/images`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              },
            );

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              if (onImageAdded) {
                onImageAdded(createdPlace.id, {
                  id: uploadData.id,
                  url: uploadData.url,
                });
              }
            }
          } catch (err) {
            console.error(`Ошибка загрузки ${file.name}:`, err);
          }
        }
      }

      setTitle("");
      setDescription("");
      setAddress("");
      setMushroomType("");
      setSelectedFiles([]);
      setPreviewUrls([]);
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

      <select
        value={mushroomType}
        onChange={(e) => setMushroomType(e.target.value)}
        className="w-full border p-2 mb-2 rounded text-sm bg-white"
        disabled={isSubmitting}
      >
        <option value="">Выберите тип гриба (не обязательно)</option>
        <option value="white">Белый гриб</option>
        <option value="boletus">Подберёзовик</option>
        <option value="chanterelle">Лисички</option>
        <option value="aspen">Подосиновик</option>
        <option value="russula">Сыроежка</option>
        <option value="honey">Опята</option>
        <option value="morel">Сморчок</option>
        <option value="truffle">Трюфель</option>
        <option value="other">Другой</option>
      </select>

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
        placeholder="Описание (какие грибы, когда собирали)..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border p-2 mb-1 rounded text-sm h-20 resize-none"
        disabled={isSubmitting}
        maxLength={500}
      />
      <p className="text-xs text-gray-400 mb-2">
        {description.length}/500 символов
      </p>

      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">
          Фото ({selectedFiles.length} выбрано):
        </label>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          multiple
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2"
          disabled={isSubmitting}
        />

        {selectedFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-20 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs hover:bg-red-600"
                  disabled={isSubmitting}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
        📍 {lat.toFixed(6)}, {lng.toFixed(6)}
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
// КОМПОНЕНТ: Маркер нового места
// ============================================

const NewPlaceMarker = memo(function NewPlaceMarker({
  position,
  onSubmit,
  onCancel,
  token,
  onImageAdded,
}: {
  position: { lat: number; lng: number };
  onSubmit: (data: Omit<Place, "id" | "createdAt">) => Promise<Place>;
  onCancel: () => void;
  token: string | null;
  onImageAdded?: (placeId: number, image: PlaceImage) => void;
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
          onImageAdded={onImageAdded}
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
  token,
}: {
  onPositionChange: (pos: { lat: number; lng: number }) => void;
  token: string | null;
}) {
  useMapEvents({
    click(e) {
      if (!token) {
        alert("Войдите в систему, чтобы добавлять места");
        return;
      }
      onPositionChange(e.latlng);
    },
  });
  return null;
}

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ: Map
// ============================================

interface MapProps {
  places: Place[];
  onAddPlace: (data: Omit<Place, "id" | "createdAt">) => Promise<Place>;
  onImageAdded: (placeId: number, image: PlaceImage) => void;
  isLoading?: boolean;
}

export function Map({ places, onAddPlace, onImageAdded, isLoading }: MapProps) {
  const [newPlacePos, setNewPlacePos] = useState<[number, number] | null>(null);
  const { token } = useAuthStore();

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (!token) {
          alert("Войдите в систему, чтобы добавлять места");
          return;
        }
        setNewPlacePos([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  };

  return (
    <div className="relative h-[600px] w-full">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 z-[1000] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-bounce text-4xl mb-2">🍄</div>
            <p>Загрузка мест...</p>
          </div>
        </div>
      )}

      <MapContainer center={[53.9, 27.56]} zoom={7} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler />

        {/* Маркер нового места (вне кластеризации) */}
        {newPlacePos && (
          <Marker position={newPlacePos} icon={newPlaceIcon}>
            <Popup>
              <PopupForm
                lat={newPlacePos[0]}
                lng={newPlacePos[1]}
                onSubmit={async (data) => {
                  const place = await onAddPlace(data);
                  setNewPlacePos(null);
                  return place;
                }}
                onCancel={() => setNewPlacePos(null)}
                token={token}
                onImageAdded={onImageAdded}
              />
            </Popup>
          </Marker>
        )}

        {/* Кластеризация существующих мест */}
        <MapCluster places={places} token={token} onImageAdded={onImageAdded} />
      </MapContainer>
    </div>
  );
}

export type { PlaceImage, Place };
