"use client";

import { useState, memo } from "react";
import { ImageUpload } from "./ImageUploader";
import type { Place, PlaceImage } from "@/types";

interface Props {
  place: Place;
  token: string | null;
  currentUserId?: number | null; // 🆕 Добавлен null для соответствия Map.tsx
  onImageAdded: (placeId: number, image: PlaceImage) => void;
}

export const PlacePopup = memo(function PlacePopup({
  place,
  token,
  currentUserId,
  onImageAdded,
}: Props) {
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const isOwner = currentUserId != null && place.ownerId === currentUserId; // 🆕 Строгая проверка

  return (
    <div
      className="min-w-[250px] max-w-[300px]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Главное фото */}
      {place.images?.[0]?.url && (
        <div className="mb-3">
          <img
            src={place.images[0].url}
            alt={place.title}
            className="w-full h-32 object-cover rounded-lg"
          />
          {place.images.length > 1 && !showAllPhotos && (
            <button
              onClick={() => setShowAllPhotos(true)}
              className="text-xs text-blue-600 mt-1 hover:underline"
            >
              +{place.images.length - 1} фото
            </button>
          )}
        </div>
      )}

      {/* Остальные фото */}
      {showAllPhotos && place.images && place.images.length > 1 && (
        <div className="grid grid-cols-2 gap-1 mb-3">
          {place.images.slice(1).map((img) => (
            <img
              key={img.id}
              src={img.url}
              alt=""
              className="w-full h-20 object-cover rounded"
            />
          ))}
        </div>
      )}

      {/* Информация */}
      <h3 className="font-bold text-lg">{place.title}</h3>

      {place.mushroomType?.name && (
        <p className="text-sm text-green-700 mt-1">
          🍄 {place.mushroomType.name}
        </p>
      )}

      {place.address && (
        <p className="text-sm text-gray-600 mt-1">📍 {place.address}</p>
      )}

      {place.description && (
        <p className="text-sm mt-2 text-gray-700 line-clamp-3">
          {place.description}
        </p>
      )}

      {place.ownerUsername && (
        <p className="text-xs text-gray-500 mt-2">
          👤 {place.ownerUsername}
          {isOwner && <span className="text-green-600 font-medium"> (вы)</span>}
        </p>
      )}

      {/* Загрузка фото только для владельца */}
      {token && place.id && isOwner && (
        <ImageUpload
          placeId={place.id}
          token={token}
          onUpload={(img) => onImageAdded(place.id!, img)}
        />
      )}
    </div>
  );
});
