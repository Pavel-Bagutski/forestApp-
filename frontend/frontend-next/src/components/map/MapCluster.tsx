"use client";

import { memo } from "react";
import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { DivIcon } from "leaflet";
import { PlacePopup } from "./PlacePopup";
import type { Place, PlaceImage } from "@/types";

// Иконка кластера
const createClusterIcon = (count: number) => {
  const size = count < 10 ? 40 : count < 100 ? 50 : 60;
  const color = count < 10 ? "#22c55e" : count < 100 ? "#eab308" : "#ef4444";

  return new DivIcon({
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">${count}</div>`,
    className: "marker-cluster-custom",
    iconSize: [size, size],
  });
};

// Иконка места
const placeIcon = new DivIcon({
  html: `<div style="width:40px;height:40px;background:#22c55e;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);">🍄</span></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

interface MapClusterProps {
  places: Place[];
  token: string | null;
  currentUserId?: number | null;
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
      iconCreateFunction={(cluster: any) =>
        createClusterIcon(cluster.getChildCount())
      }
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
          icon={placeIcon}
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
