import { DivIcon } from "leaflet";

// ============================================
// SVG ИКОНКИ ГРИБОВ (встроенные для лучшего качества)
// ============================================

const mushroomSVG = (color: string) => `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Тень -->
  <ellipse cx="24" cy="42" rx="10" ry="3" fill="rgba(0,0,0,0.2)"/>
  
  <!-- Ножка -->
  <path d="M20 24h8v14c0 2-1.8 4-4 4s-4-2-4-4V24z" fill="#f5deb3"/>
  <path d="M20 24h8v2h-8z" fill="#e6d3a3"/>
  
  <!-- Шляпка -->
  <path d="M8 24c0-8 7.2-16 16-16s16 8 16 16H8z" fill="url(#grad-${color})"/>
  
  <!-- Блик на шляпке -->
  <ellipse cx="18" cy="14" rx="4" ry="2" fill="rgba(255,255,255,0.3)" transform="rotate(-20 18 14)"/>
  
  <!-- Точки на шляпке (для красного гриба) -->
  ${color === 'red' ? `
    <circle cx="14" cy="20" r="1.5" fill="rgba(255,255,255,0.8)"/>
    <circle cx="22" cy="16" r="1.2" fill="rgba(255,255,255,0.8)"/>
    <circle cx="28" cy="21" r="1.3" fill="rgba(255,255,255,0.8)"/>
    <circle cx="32" cy="18" r="1" fill="rgba(255,255,255,0.8)"/>
  ` : ''}
  
  <!-- Градиенты -->
  <defs>
    <linearGradient id="grad-green" x1="8" y1="8" x2="40" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="50%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#16a34a"/>
    </linearGradient>
    <linearGradient id="grad-red" x1="8" y1="8" x2="40" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f87171"/>
      <stop offset="50%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
    <linearGradient id="grad-blue" x1="8" y1="8" x2="40" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="50%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="grad-orange" x1="8" y1="8" x2="40" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fb923c"/>
      <stop offset="50%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
    <linearGradient id="grad-purple" x1="8" y1="8" x2="40" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#9333ea"/>
    </linearGradient>
    <linearGradient id="grad-gold" x1="8" y1="8" x2="40" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
</svg>
`;

// ============================================
// СОЗДАНИЕ ИКОНОК
// ============================================

interface IconOptions {
  color: string;
  size: number;
  isPulse?: boolean;
  isNew?: boolean;
}

const createIcon = ({ color, size, isPulse = false, isNew = false }: IconOptions) => {
  const pulseClass = isPulse ? "marker-pulse" : "";
  const newBadge = isNew ? '<div class="new-badge">NEW</div>' : "";
  
  return new DivIcon({
    className: `custom-marker ${pulseClass}`,
    html: `
      <div class="marker-wrapper" style="width: ${size}px; height: ${size}px;">
        <div class="marker-container" style="
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.25)) 
                  drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        ">
          ${mushroomSVG(color)}
        </div>
        ${isPulse ? `
          <div class="pulse-ring ring-1"></div>
          <div class="pulse-ring ring-2"></div>
        ` : ''}
        ${newBadge}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size - 10],
  });
};

// ============================================
// ГОТОВЫЕ ИКОНКИ
// ============================================

// 🟢 Существующее место
export const existingPlaceIcon = createIcon({ color: "green", size: 40 });

// 🔴 Новое место (с пульсацией)
export const newPlaceIcon = createIcon({ color: "red", size: 50, isPulse: true });

// 🔵 Выбранное место
export const selectedPlaceIcon = createIcon({ color: "blue", size: 44 });

// 🟠 Место текущего пользователя
export const myPlaceIcon = createIcon({ color: "orange", size: 42 });

// 🟣 VIP/Избранное место
export const vipPlaceIcon = createIcon({ color: "purple", size: 46 });

// 🟡 Недавно добавленное
export const recentPlaceIcon = createIcon({ color: "gold", size: 42, isNew: true });

// ============================================
// ИКОНКА КЛАСТЕРА
// ============================================

export const createClusterIcon = (count: number) => {
  const size = count < 10 ? 48 : count < 100 ? 58 : 68;
  const fontSize = count < 10 ? 18 : count < 100 ? 16 : 14;
  
  // Цвет в зависимости от количества
  let gradientFrom = "#22c55e";
  let gradientTo = "#16a34a";
  let shadowColor = "rgba(34, 197, 94, 0.4)";
  
  if (count >= 10) {
    gradientFrom = "#eab308";
    gradientTo = "#ca8a04";
    shadowColor = "rgba(234, 179, 8, 0.4)";
  }
  if (count >= 100) {
    gradientFrom = "#ef4444";
    gradientTo = "#dc2626";
    shadowColor = "rgba(239, 68, 68, 0.4)";
  }

  return new DivIcon({
    className: "cluster-marker",
    html: `
      <div class="cluster-wrapper" style="width: ${size}px; height: ${size}px;">
        <div class="cluster-container" style="
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%);
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 
            0 8px 20px rgba(0,0,0,0.25),
            0 0 0 4px ${shadowColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: ${fontSize}px;
          font-family: system-ui, -apple-system, sans-serif;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          ${count}
        </div>
        <div class="cluster-mushroom-icon">
          <svg width="14" height="14" viewBox="0 0 48 48" fill="none">
            <path d="M24 8c-8 0-14 6-14 12h28c0-6-6-12-14-12z" fill="white"/>
            <path d="M22 20h4v8c0 1.1-.9 2-2 2s-2-.9-2-2v-8z" fill="white"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};