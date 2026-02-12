"use client";

import { memo, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { DivIcon } from "leaflet";
import { ImageUpload } from "./Map";

// ============================================
// ИНТЕРФЕЙСЫ
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
  mushroomType?: string; // Название типа (для отображения)
  images?: PlaceImage[];
  createdAt?: string;
  ownerId?: number; // 🆕 ID владельца
  ownerUsername?: string; // 🆕 Имя владельца
}

// ============================================
// ИКОНКИ
// ============================================

export const existingPlaceIcon = new DivIcon({
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

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = 40;
  let color = "#22c55e";

  if (count < 10) {
    size = 40;
    color = "#22c55e";
  } else if (count < 100) {
    size = 50;
    color = "#eab308";
  } else {
    size = 60;
    color = "#ef4444";
  }

  return new DivIcon({
    html: `  
      <div style="  
        width: ${size}px;  
        height: ${size}px;  
        background: ${color};  
        border: 3px solid white;  
        border-radius: 50%;  
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);  
        display: flex;  
        align-items: center;  
        justify-content: center;  
        color: white;  
        font-weight: bold;  
        font-size: 14px;  
      ">  
        ${count}  
      </div>  
    `,
    className: "marker-cluster-custom",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// ============================================
// КОНСТАНТЫ
// ============================================

const MUSHROOM_LABELS: Record<string, string> = {
  white: "Белый гриб",
  boletus: "Подберёзовик",
  chanterelle: "Лисички",
  aspen: "Подосиновик",
  russula: "Сыроежка",
  honey: "Опята",
  morel: "Сморчок",
  truffle: "Трюфель",
  other: "Другой",
};

// ============================================
// КОМПОНЕНТ: Попап места
// ============================================

interface PlacePopupProps {
  place: Place;
  token: string | null;
  currentUserId?: number | null; // 🆕 ID текущего пользователя
  onImageAdded: (placeId: number, image: PlaceImage) => void;
}

const PlacePopup = memo(function PlacePopup({
  place,
  token,
  currentUserId,
  onImageAdded,
}: PlacePopupProps) {
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  // 🆕 ПРОВЕРКА ВЛАДЕЛЬЦА
  const isOwner =
    currentUserId != null &&
    place.ownerId != null &&
    currentUserId === place.ownerId;

  // Определяем название типа гриба
  const mushroomLabel =
    place.mushroomType ||
    (place.mushroomType ? MUSHROOM_LABELS[place.mushroomType] : null);

  const handlePopupClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleShowMoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAllPhotos(true);
  };

  return (
    <div className="min-w-[250px] max-w-[300px]" onClick={handlePopupClick}>
      {/* Галерея фото */}
      {place.images && place.images[0]?.url ? (
        <div className="mb-3">
          <img
            src={place.images[0].url}
            alt={place.title}
            className="w-full h-32 object-cover rounded-lg"
          />
          {place.images.length > 1 && !showAllPhotos && (
            <button
              type="button"
              onClick={handleShowMoreClick}
              className="text-xs text-blue-600 mt-1 hover:underline cursor-pointer"
            >
              +{place.images.length - 1} фото ещё
            </button>
          )}

          {showAllPhotos && place.images.length > 1 && (
            <div className="grid grid-cols-2 gap-1 mt-2">
              {place.images.slice(1).map((img) => (
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
      ) : (
        <div className="mb-3 p-4 bg-gray-100 rounded-lg text-center text-gray-500 text-sm">
          Нет фото
        </div>
      )}

      {/* Информация о месте */}
      <h3 className="font-bold text-lg">{place.title}</h3>

      {mushroomLabel && (
        <p className="text-sm text-green-700 mt-1 font-medium">
          🍄 {mushroomLabel}
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

      {/* 🆕 Информация о владельце */}
      {place.ownerUsername && (
        <p className="text-xs text-gray-500 mt-2">
          👤 {place.ownerUsername}
          {isOwner && <span className="text-green-600 font-medium"> (вы)</span>}
        </p>
      )}

      {place.createdAt && (
        <p className="text-xs text-gray-500 mt-1">
          🕒 {new Date(place.createdAt).toLocaleDateString("ru-RU")}
        </p>
      )}

      {/* Координаты и статистика */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          📍 {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
        </p>
        {place.images && place.images.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            📷 Фотографий: {place.images.length}
          </p>
        )}
      </div>

      {/* 🆕 ЗАГРУЗКА ФОТО: только для владельца */}
      {token && place.id && isOwner && (
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
// КОМПОНЕНТ: Кластеризация
// ============================================

interface MapClusterProps {
  places: Place[];
  token: string | null;
  currentUserId?: number | null; // 🆕
  onImageAdded: (placeId: number, image: PlaceImage) => void;
}

export const MapCluster = memo(function MapCluster({
  places,
  token,
  currentUserId,
  onImageAdded,
}: MapClusterProps) {
  return (
    <MarkerClusterGroup
      chunkedLoading
      iconCreateFunction={createClusterIcon}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={true}
      zoomToBoundsOnClick={true}
      maxClusterRadius={80}
      disableClusteringAtZoom={16}
    >
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
              currentUserId={currentUserId}
              onImageAdded={onImageAdded}
            />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
});
