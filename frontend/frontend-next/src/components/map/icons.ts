import { DivIcon } from "leaflet";

export const createIcon = (color: string, size: number) =>
  new DivIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      ">
        <span style="transform: rotate(45deg);">🍄</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });

export const newPlaceIcon = createIcon("#ef4444", 50);
export const existingPlaceIcon = createIcon("#22c55e", 40);