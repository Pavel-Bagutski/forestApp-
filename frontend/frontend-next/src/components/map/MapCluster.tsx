"use client";

import { memo } from "react";
import { Marker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { DivIcon } from "leaflet";
import type { Place, PlaceImage } from "@/types";

// ============================================
// ИКОНКИ
// ============================================

// Иконка кластера
const createClusterIcon = (count: number) => {
  const size = count < 10 ? 40 : count < 100 ? 50 : 60;
  const color = count < 10 ? "#22c55e" : count < 100 ? "#eab308" : "#ef4444";

  return new DivIcon({
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        background:${color};
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-weight:bold;
        font-size:14px;
        border:3px solid white;
        box-shadow:0 4px 12px rgba(0,0,0,0.3);
      ">${count}</div>
    `,
    className: "marker-cluster-custom",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Иконка места
const placeIcon = new DivIcon({
  html: `
    <div style="
      width:40px;
      height:40px;
      background:#22c55e;
      border:3px solid white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 4px 8px rgba(0,0,0,0.3);
    ">
      <span style="transform:rotate(45deg); font-size:18px;">🍄</span>
    </div>
  `,
  className: "custom-marker",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// ============================================
// ТИПЫ
// ============================================
interface MapClusterProps {
  places: Place[];
  onImageAdded?: (placeId: number, image: PlaceImage) => void;
  onPlaceClick?: (place: Place) => void;
}

// ============================================
// КОМПОНЕНТ
// ============================================
export const MapCluster = memo(function MapCluster({
  places,
  onPlaceClick,
}: MapClusterProps) {
  const handleMarkerClick = (place: Place) => {
    // Открываем кастомный попап через событие
    const event = new CustomEvent('openPlacePopup', { detail: place });
    window.dispatchEvent(event);
    onPlaceClick?.(place);
  };

  return (
    <MarkerClusterGroup
      chunkedLoading
      iconCreateFunction={(cluster: any) => createClusterIcon(cluster.getChildCount())}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={true}
      zoomToBoundsOnClick={true}
      maxClusterRadius={80}
      disableClusteringAtZoom={16}
      animate={true}
      animateAddingMarkers={true}
    >
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={placeIcon}
          eventHandlers={{
            click: () => handleMarkerClick(place),
          }}
        />
      ))}
    </MarkerClusterGroup>
  );
});

export default MapCluster;
