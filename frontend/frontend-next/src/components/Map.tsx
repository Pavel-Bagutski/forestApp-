"use client";

import { useState, useEffect } from "react";
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
  token?: string;
};

export default function Map({ token }: MapProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [newPlace, setNewPlace] = useState<Place | null>(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/places")
      .then((res) => res.json())
      .then((data) => setPlaces(data))
      .catch(console.error);
  }, []);

  const handleAddPlace = async (place: Place) => {
    if (!token) {
      alert("Пожалуйста, авторизуйтесь для добавления места");
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

      if (!res.ok) throw new Error("Ошибка при сохранении");

      const savedPlace = await res.json();
      setPlaces((prev) => [...prev, savedPlace]);
      setNewPlace(null);
    } catch (err) {
      alert("Не удалось сохранить место");
      console.error(err);
    }
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setNewPlace({ title: "", latitude: lat, longitude: lng });
      },
    });

    if (!newPlace) return null;

    return (
      <Marker
        position={[newPlace.latitude, newPlace.longitude]}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const pos = marker.getLatLng();
            setNewPlace((prev) =>
              prev ? { ...prev, latitude: pos.lat, longitude: pos.lng } : null,
            );
          },
        }}
      >
        <Popup>
          <div className="flex flex-col">
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
              onClick={() => handleAddPlace(newPlace)}
              className="bg-green-600 text-white px-3 py-1 mt-1 rounded"
            >
              Сохранить
            </button>
          </div>
        </Popup>
      </Marker>
    );
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

      {places.map((place) => (
        <Marker key={place.id} position={[place.latitude, place.longitude]}>
          <Popup>
            <strong>{place.title}</strong>
            <br />
            {place.description || "Нет описания"}
          </Popup>
        </Marker>
      ))}

      <LocationMarker />
    </MapContainer>
  );
}
