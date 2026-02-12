"use client";

import { memo, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { DivIcon } from "leaflet";
import { ImageUpload } from "./Map"; // 🆕 Импорт из Map.tsx

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
  mushroomType?: string;
  images?: PlaceImage[];
  createdAt?: string;
}

// Иконка для отдельного маркера
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

// Иконка для кластера
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

// Словарь для отображения типов грибов
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

interface PlacePopupProps {
  place: Place;
  token: string | null;
  onImageAdded: (placeId: number, image: PlaceImage) => void;
}

// Компонент попапа для места
const PlacePopup = memo(function PlacePopup({
  place,
  token,
  onImageAdded,
}: PlacePopupProps) {
  const [showAllPhotos, setShowAllPhotos] = useState(false); // 🆕 Добавлено состояние
  const mushroomLabel = place.mushroomType
    ? MUSHROOM_LABELS[place.mushroomType] || place.mushroomType
    : null;

  return (
    <div className="min-w-[250px] max-w-[300px]">
      {place.images && place.images[0]?.url ? (
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
              +{place.images.length - 1} фото ещё
            </button>
          )}

          {/* 🆕 Показ всех фото */}
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
        <p className="text-sm mt-2 text-gray-700">{place.description}</p>
      )}

      {/* 🆕 Дата создания */}
      {place.createdAt && (
        <p className="text-xs text-gray-500 mt-2">
          🕒 Добавлено: {new Date(place.createdAt).toLocaleDateString("ru-RU")}
        </p>
      )}

      {/* 🆕 Координаты */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          📍 Координаты: {place.latitude.toFixed(6)},{" "}
          {place.longitude.toFixed(6)}
        </p>
        {place.images && place.images.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            📷 Фотографий: {place.images.length}
          </p>
        )}
      </div>

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

interface MapClusterProps {
  places: Place[];
  token: string | null;
  onImageAdded: (placeId: number, image: PlaceImage) => void;
}

// Компонент кластеризации
export const MapCluster = memo(function MapCluster({
  places,
  token,
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
              onImageAdded={onImageAdded}
            />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
});
