"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAuthStore } from "@/store/authStore";
import { MapCluster } from "./MapCluster";
import { PlaceForm } from "./PlaceForm";
import { newPlaceIcon } from "./icons";
import type { MapProps } from "@/types";

// Подкомпонент для обработки кликов по карте
function MapClickHandler({
  onClick,
}: {
  onClick: (pos: [number, number]) => void;
}) {
  const { useMapEvents } = require("react-leaflet");
  useMapEvents({
    click: (e: any) => onClick([e.latlng.lat, e.latlng.lng]),
  });
  return null;
}

export function Map({
  places,
  mushroomTypes,
  onAddPlace,
  onImageAdded,
  isLoading,
}: MapProps) {
  const [newPlacePos, setNewPlacePos] = useState<[number, number] | null>(null);
  const { token, user } = useAuthStore();

  const handleMapClick = (pos: [number, number]) => {
    if (!token) {
      alert("Войдите в систему, чтобы добавлять места");
      return;
    }
    setNewPlacePos(pos);
  };

  return (
    <div className="relative h-[600px] w-full">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 z-[1000] flex items-center justify-center">
          <div className="animate-bounce text-4xl mb-2">🍄</div>
          <p>Загрузка...</p>
        </div>
      )}

      <MapContainer center={[53.9, 27.56]} zoom={7} className="h-full w-full">
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onClick={handleMapClick} />

        {newPlacePos && (
          <Marker position={newPlacePos} icon={newPlaceIcon}>
            <Popup>
              <PlaceForm
                lat={newPlacePos[0]}
                lng={newPlacePos[1]}
                mushroomTypes={mushroomTypes}
                token={token}
                onSubmit={async (data) => {
                  const place = await onAddPlace(data);
                  setNewPlacePos(null);
                  return place;
                }}
                onCancel={() => setNewPlacePos(null)}
                onImageAdded={onImageAdded}
              />
            </Popup>
          </Marker>
        )}

        <MapCluster
          places={places}
          token={token}
          currentUserId={user?.id}
          onImageAdded={onImageAdded}
        />
      </MapContainer>
    </div>
  );
}
