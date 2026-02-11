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
// КОМПОНЕНТ: Загрузка изображения
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
      alert("✅ Фото загружено!");
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("❌ " + (err.message || "Ошибка загрузки"));
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Пожалуйста, выберите изображение");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Файл слишком большой (максимум 5MB)");
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      const placeData = {
        title,
        description,
        address,
        latitude: lat,
        longitude: lng,
      };

      const createdPlace = await onSubmit(placeData);

      if (selectedFile && createdPlace?.id) {
        const formData = new FormData();
        formData.append("file", selectedFile);

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

        if (!uploadRes.ok) {
          console.error("Не удалось загрузить фото, но место создано");
        } else {
          const uploadData = await uploadRes.json();
          console.log("Фото загружено:", uploadData.url);

          if (onImageAdded) {
            onImageAdded(createdPlace.id, {
              id: uploadData.id,
              url: uploadData.url,
            });
          }
        }
      }

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
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-24 object-cover rounded mb-2"
              />
            )}
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

  const handleShowPhotos = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllPhotos(true);
  };

  return (
    <div className="min-w-[250px] max-w-[300px]">
      {hasImages && images[0]?.url ? (
        <div className="mb-3">
          <img
            src={images[0].url}
            alt={place.title}
            className="w-full h-32 object-cover rounded-lg"
          />
          {images.length > 1 && !showAllPhotos && (
            <button
              onClick={handleShowPhotos}
              className="text-xs text-blue-600 mt-1 hover:underline"
            >
              +{images.length - 1} фото ещё
            </button>
          )}

          {showAllPhotos && images.length > 1 && (
            <div className="grid grid-cols-2 gap-1 mt-2">
              {images
                .slice(1)
                .map(
                  (img) =>
                    img?.url && (
                      <img
                        key={img.id}
                        src={img.url}
                        alt="Фото места"
                        className="w-full h-20 object-cover rounded"
                      />
                    ),
                )}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3 p-4 bg-gray-100 rounded-lg text-center text-gray-500 text-sm">
          Нет фото
        </div>
      )}

      <h3 className="font-bold text-lg">{place.title}</h3>

      {place.address && (
        <p className="text-sm text-gray-600 mt-1">📍 {place.address}</p>
      )}

      {place.description && (
        <p className="text-sm mt-2 text-gray-700">{place.description}</p>
      )}

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
// ОСНОВНОЙ КОМПОНЕНТ: Map (ВСТАВИТЬ СЮДА)
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
                onImageAdded={onImageAdded}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
