"use client";

import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type Place = {
  id?: number;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
};

type MapProps = {
  places?: Place[];
  onPlaceAdd?: (place: Place) => void;
};

export default function MapClient({ places = [], onPlaceAdd }: MapProps) {
  const [newPlace, setNewPlace] = useState<Place | null>(null);

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setNewPlace({ title: "", latitude: lat, longitude: lng });
      },
    });

    return newPlace ? (
      <Marker
        position={[newPlace.latitude, newPlace.longitude]}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            setNewPlace((prev) =>
              prev
                ? { ...prev, latitude: position.lat, longitude: position.lng }
                : null,
            );
          },
        }}
      >
        <Popup>
          <div>
            <input
              type="text"
              placeholder="Название места"
              value={newPlace.title}
              onChange={(e) =>
                setNewPlace({ ...newPlace, title: e.target.value })
              }
              className="border p-1 mb-1 w-full"
            />
            <textarea
              placeholder="Описание"
              value={newPlace.description || ""}
              onChange={(e) =>
                setNewPlace({ ...newPlace, description: e.target.value })
              }
              className="border p-1 w-full"
            />
            <button
              onClick={() => {
                if (onPlaceAdd && newPlace.title) {
                  onPlaceAdd(newPlace);
                  setNewPlace(null);
                }
              }}
              className="bg-green-600 text-white px-3 py-1 mt-1 rounded"
            >
              Сохранить
            </button>
          </div>
        </Popup>
      </Marker>
    ) : null;
  }

  return (
    <MapContainer
      center={[55.751244, 37.618423]}
      zoom={5}
      style={{ height: "600px", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {places.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]}>
          <Popup>
            <strong>{p.title}</strong>
            <br />
            {p.description || "Нет описания"}
          </Popup>
        </Marker>
      ))}

      <LocationMarker />
    </MapContainer>
  );
}
