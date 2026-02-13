"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Rectangle,
} from "react-leaflet";
import { DivIcon, LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapMarkers.css";
import { useAuthStore } from "@/store/authStore";
import { PlacePopup } from "./PlacePopup";
import { NewPlacePopup } from "./PlacePopupCreating";
import { MapCluster } from "./MapCluster";

// ============================================
// ТИПЫ
// ============================================
export interface PlaceImage {
  id: number;
  url: string;
  uploadedAt?: string;
}

export interface Place {
  id: number;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  images?: PlaceImage[];
  createdAt?: string;
  userId?: number;
  mushroomTypes?: MushroomType[];
}

export interface MushroomType {
  id: number;
  name: string;
  color?: string;
  icon?: string;
}

// ============================================
// ИКОНКИ
// ============================================
const createIcon = (isNew: boolean, size: number) =>
  new DivIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${isNew ? "#ef4444" : "#22c55e"};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <span style="transform: rotate(45deg); font-size: 20px;">🍄</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 5)],
  });

const newPlaceIcon = createIcon(true, 50);
const existingPlaceIcon = createIcon(false, 40);

// ============================================
// КОМПОНЕНТЫ
// ============================================

interface MapClickHandlerProps {
  onClick: (lat: number, lng: number) => void;
}

// ============================================
// ГРАНИЦЫ БЕЛАРУСИ
// ============================================
const BELARUS_BOUNDS = new LatLngBounds(
  [51.2, 23.2], // Юго-запад (минимальные lat, lng)
  [56.2, 32.8], // Северо-восток (максимальные lat, lng)
);

const BELARUS_CENTER: [number, number] = [53.9, 27.56];

const MapClickHandler = memo(function MapClickHandler({
  onClick,
}: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      // Проверяем, что клик внутри Беларуси
      if (BELARUS_BOUNDS.contains([lat, lng])) {
        onClick(lat, lng);
      }
    },
  });
  return null;
});

// PlacePopup импортируется из ./PlacePopup

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================

interface MapProps {
  places?: Place[];
  onAddPlace?: (placeData: Omit<Place, "id" | "createdAt" | "images" | "mushroomTypes"> & { 
    images?: File[];
    mushroomTypeIds: number[];
    newMushroomTypes: { name: string; category?: string }[];
  }) => Promise<Place>;
  onImageAdded?: (placeId: number, image: PlaceImage) => void;
  isLoading?: boolean;
  mushroomTypes?: MushroomType[]; // Опционально, для совместимости
}

export default function Map({
  places = [],
  onAddPlace,
  onImageAdded,
  isLoading = false,
  mushroomTypes = [],
}: MapProps) {
  const [newPosition, setNewPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [mapStyle, setMapStyle] = useState<"osm" | "cyclosm">("cyclosm");
  const [enhanceForest, setEnhanceForest] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Слушаем событие открытия попапа
  useEffect(() => {
    const handleOpenPopup = (e: CustomEvent<Place>) => {
      setSelectedPlace(e.detail);
    };
    window.addEventListener("openPlacePopup", handleOpenPopup as EventListener);
    return () =>
      window.removeEventListener(
        "openPlacePopup",
        handleOpenPopup as EventListener,
      );
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setNewPosition({ lat, lng });
  }, []);

  const handlePlaceAdd = useCallback(
    async (placeData: {
      title: string;
      description: string;
      latitude: number;
      longitude: number;
      images: File[];
      mushroomTypeIds: number[];
      newMushroomTypes: { name: string; category?: string }[];
    }): Promise<void> => {
      if (!onAddPlace) return;

      try {
        // 1. Создаём место (без фото)
        const createdPlace = await onAddPlace({
          title: placeData.title,
          description: placeData.description,
          latitude: placeData.latitude,
          longitude: placeData.longitude,
          mushroomTypeIds: placeData.mushroomTypeIds,
          newMushroomTypes: placeData.newMushroomTypes,
        });

        // 2. Загружаем фото по одному (если есть)
        if (placeData.images.length > 0 && createdPlace?.id && token) {
          for (const imageFile of placeData.images) {
            const formData = new FormData();
            formData.append("file", imageFile);
            
            try {
              const res = await fetch(
                `http://localhost:8080/api/places/${createdPlace.id}/images`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  body: formData,
                }
              );
              
              if (!res.ok) {
                console.error("Failed to upload image:", res.status);
              }
            } catch (imgErr) {
              console.error("Image upload error:", imgErr);
            }
          }
        }

        setNewPosition(null); // Закрываем
      } catch (err) {
        console.error("Failed to add place:", err);
        throw err;
      }
    },
    [onAddPlace, token],
  );

  if (!isMounted || isLoading) {
    return (
      <div className="h-[95vh] w-screen mx-auto mb-4 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-bounce text-4xl mb-2">🍄</div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  const tileLayers = {
    osm: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
    cyclosm: {
      url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://www.cyclosm.org">CyclOSM</a>',
    },
  };

  return (
    <div className="h-[95vh] w-[90vw] mx-auto relative">
      {/* Панель управления стилем карты */}
      <div className="absolute top-3 right-3 z-[1000] bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2">
        {/* Индикатор Беларуси */}
        <div className="flex items-center gap-2 px-2 py-1 bg-green-50 rounded border border-green-200">
          <span className="text-lg">🇧🇾</span>
          <span className="text-xs font-bold text-green-800">Беларусь</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <span>🗺️ Карта:</span>
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value as "osm" | "cyclosm")}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="cyclosm">🌲 Лесная (CyclOSM)</option>
            <option value="osm">🗺️ Стандартная</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={enhanceForest}
            onChange={(e) => setEnhanceForest(e.target.checked)}
            className="rounded"
          />
          <span>🌲 Усилить леса</span>
        </label>
      </div>

      {/* Кастомный attribution снизу справа */}
      <div className="custom-attribution">
        <a
          href="https://leafletjs.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Leaflet
        </a>
        {" | "}©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap
        </a>
      </div>

      <MapContainer
        center={BELARUS_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={18}
        scrollWheelZoom={true}
        className={`h-full w-full ${enhanceForest ? "forest-enhanced" : ""}`}
        maxBounds={BELARUS_BOUNDS}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          url={tileLayers[mapStyle].url}
          // без attribution
        />

        {/* Граница Беларуси */}
        <Rectangle
          bounds={BELARUS_BOUNDS}
          pathOptions={{
            color: "#22c55e",
            weight: 3,
            opacity: 0.6,
            fillColor: "#22c55e",
            fillOpacity: 0.02,
            dashArray: "10, 10",
          }}
        />

        {/* Подпись Беларусь */}
        <Marker
          position={[55.5, 28.0]}
          icon={
            new DivIcon({
              className: "belarus-label",
              html: '<div style="font-size: 18px; font-weight: bold; color: #15803d; text-shadow: 2px 2px 4px rgba(255,255,255,0.8); white-space: nowrap;">🇧🇾 Беларусь</div>',
              iconSize: [100, 30],
              iconAnchor: [50, 15],
            })
          }
          interactive={false}
        />

        <MapClickHandler onClick={handleMapClick} />

        {/* Кластеризованные маркеры */}
        <MapCluster
          places={places}
          onImageAdded={onImageAdded}
          onPlaceClick={setSelectedPlace}
        />

        {/* Маркер нового места (только иконка, без popup) */}
        {newPosition && (
          <Marker
            position={[newPosition.lat, newPosition.lng]}
            icon={newPlaceIcon}
          />
        )}
      </MapContainer>

      {/* Кастомный попап существующего места */}
      {selectedPlace &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
            <PlacePopup
              place={selectedPlace}
              onImageAdded={onImageAdded}
              onClose={() => setSelectedPlace(null)}
              isOpen={true}
            />
          </div>,
          document.body,
        )}

      {/* Кастомный попап добавления нового места */}
      {newPosition &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
            <NewPlacePopup
              lat={newPosition.lat}
              lng={newPosition.lng}
              isOpen={true}
              onClose={() => setNewPosition(null)}
              mushroomTypes={mushroomTypes}
              onSubmit={async (data) => {
                await handlePlaceAdd(data);
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
