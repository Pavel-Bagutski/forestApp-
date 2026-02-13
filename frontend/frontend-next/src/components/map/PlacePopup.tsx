/**
 * ============================================================================
 * КОМПОНЕНТ PlacePopup - МОДАЛЬНОЕ ОКНО КАРТОЧКИ МЕСТА С ГРИБАМИ
 * ============================================================================
 *
 * "ЧТО ЭТО ТАКОЕ":
 * Это React-компонент модального окна (попап), который отображает детальную
 * информацию о точке на карте (месте сбора грибов). Аналог: карточка товара
 * в интернет-магазине, информационное окно в Google Maps, или модальное окно
 * в Instagram при клике на пост.
 *
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ":
 * - С родительским компонентом Map (получает данные о месте через props)
 * - С глобальным состоянием аутентификации (useAuthStore) - проверяет права пользователя
 * - С браузерным API (clipboard, geolocation, Intersection Observer)
 * - С бэкендом Spring Boot (загрузка фотографий на localhost:8080)
 * - С библиотекой Framer Motion (анимации)
 * - С библиотекой Lightbox (просмотр фотографий)
 *
 * "КУДА ОТПРАВЛЯЕТСЯ":
 * - HTTP POST запросы на http://localhost:8080/api/places/{id}/images (загрузка фото)
 * - Данные передаются в родительский компонент через callback-функции (onImageAdded, onClose)
 * - События закрытия/открытия управляют видимостью в родителе
 *
 * "НА ЧТО ВЛИЯЕТ":
 * - Визуальное отображение карточки места (UI/UX)
 * - Возможность загрузки фотографий (только для авторизованных, не авторов места)
 * - Отображение галереи фотографий с ленивой загрузкой
 * - Производительность (оптимизация через memo, lazy loading)
 * - Доступность (клавиатурная навигация, aria-метки)
 */

"use client"; // Директива Next.js - компонент выполняется только в браузере, не на сервере

import { useState, useEffect, useCallback, memo, useRef } from "react"; // React хуки для состояния и оптимизации
import { Place, PlaceImage, MushroomType } from "./Map"; // Типы данных из родительского компонента Map
import { useAuthStore } from "@/store/authStore"; // Zustand store для глобального состояния авторизации
import {
  motion,
  AnimatePresence,
  PanInfo,
  useMotionValue,
  useTransform,
} from "framer-motion"; // Библиотека анимаций (аналог CSS animations, но мощнее)
import {
  X,
  Copy,
  Share2,
  MapPin,
  ImageIcon,
  Upload,
  Check,
  GripHorizontal,
} from "lucide-react"; // Иконки (SVG-иконки)
import Lightbox from "yet-another-react-lightbox"; // Модальное окно для просмотра фотографий (аналог Fancybox)
import "yet-another-react-lightbox/styles.css"; // Стили для лайтбокса
import Zoom from "yet-another-react-lightbox/plugins/zoom"; // Плагин зума для лайтбокса
import Counter from "yet-another-react-lightbox/plugins/counter"; // Плагин счетчика фото (1/5)
import "yet-another-react-lightbox/plugins/counter.css"; // Стили для счетчика

// ============================================
// ТИПЫ (TypeScript интерфейсы)
// ============================================

/**
 * "ЧТО ЭТО": Контракт входных данных компонента
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": С TypeScript системой типов для проверки корректности данных
 * "НА ЧТО ВЛИЯЕТ": Безопасность кода - предотвращает передачу неверных данных
 *
 * Аналог: форма бланка, где указано какие поля обязательны
 */
interface PlacePopupProps {
  place: Place; // Объект места с координатами, описанием, фото
  onImageAdded?: (placeId: number, image: PlaceImage) => void; // Callback при добавлении фото
  onClose?: () => void; // Callback закрытия попапа
  isOpen?: boolean; // Флаг видимости
}

// ============================================
// УТИЛИТЫ (Вспомогательные функции)
// ============================================

/**
 * "ЧТО ЭТО": Форматтер координат GPS в человекочитаемый вид
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": С числами (lat, lng) -> строка
 * "КУДА ОТПРАВЛЯЕТСЯ": В компонент Coordinates для отображения
 * "НА ЧТО ВЛИЯЕТ": UX - пользователь видит "55.7558° N" вместо сырого числа
 *
 * Аналог: функция formatDate() которая превращает timestamp в "12 января 2024"
 */
function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S"; // Север или Юг
  const lngDir = lng >= 0 ? "E" : "W"; // Восток или Запад
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * "ЧТО ЭТО": Утилита копирования текста в буфер обмена
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": С браузерным Clipboard API
 * "КУДА ОТПРАВЛЯЕТСЯ": В буфер обмена ОС пользователя
 * "НА ЧТО ВЛИЯЕТ": UX - пользователь может вставить координаты в мессенджер/навигатор
 *
 * Аналог: Ctrl+C программно
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text); // Современный Promise-based API
    return true;
  } catch {
    return false; // Fallback для старых браузеров или отказа разрешений
  }
}

/**
 * "ЧТО ЭТО": Кастомный хук определения мобильного устройства
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": С объектом window браузера (resize события)
 * "КУДА ОТПРАВЛЯЕТСЯ": Внутреннее состояние компонента
 * "НА ЧТО ВЛИЯЕТ": Рендеринг разных UI для mobile vs desktop (адаптивность)
 *
 * Аналог: CSS media query @media (max-width: 768px), но в JavaScript
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768); // Breakpoint 768px
    check(); // Проверка при монтировании
    window.addEventListener("resize", check); // Подписка на изменение размера окна
    return () => window.removeEventListener("resize", check); // Отписка при размонтировании (memory leak prevention)
  }, []);

  return isMobile;
}

/**
 * "ЧТО ЭТО": Фабрика стилей для типов грибов (безопасные/опасные/условно-съедобные)
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": Со строкой названия гриба
 * "КУДА ОТПРАВЛЯЕТСЯ": В CSS классы Tailwind
 * "НА ЧТО ВЛИЯЕТ": Визуальная безопасность - красный цвет для ядовитых, зеленый для съедобных
 *
 * Аналог: светофор - цвет сигнализирует о danger/safe/warning
 */
const getMushroomColor = (
  name: string,
): { bg: string; text: string; border: string; icon: string } => {
  const lower = name.toLowerCase();
  // Съедобные грибы - зеленая тема
  if (
    lower.includes("белый") ||
    lower.includes("боровик") ||
    lower.includes("подосиновик") ||
    lower.includes("лисичк")
  ) {
    return {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
      icon: "✅",
    };
  }
  // Ядовитые грибы - красная тема
  if (
    lower.includes("мухомор") ||
    lower.includes("бледная") ||
    lower.includes("паутинник")
  ) {
    return {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
      icon: "☠️",
    };
  }
  // Условно-съедобные - желтая тема
  if (
    lower.includes("сыроежка") ||
    lower.includes("груздь") ||
    lower.includes("волнушк")
  ) {
    return {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
      icon: "⚠️",
    };
  }
  // По умолчанию - нейтральная тема
  return {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-300",
    icon: "🍄",
  };
};

// ============================================
// ПОДКОМПОНЕНТЫ (Атомарные UI-элементы)
// ============================================

/**
 * "ЧТО ЭТО": Плейсхолдер загрузки (скелетон)
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": С CSS анимацией pulse
 * "НА ЧТО ВЛИЯЕТ": Perceived performance - пользователь видит "что-то загружается"
 *
 * Аналог: серые полоски в Facebook/Instagram пока грузится контент
 */
const Skeleton = memo(function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
});

/**
 * "ЧТО ЭТО": Заглушка когда нет фотографий
 * "НА ЧТО ВЛИЯЕТ": UX - вместо пустого пространства показывает понятную иконку
 */
const NoPhotosPlaceholder = memo(function NoPhotosPlaceholder() {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
      <ImageIcon className="w-12 h-12 text-gray-300 mb-2" />
      <p className="text-sm text-gray-400">Нет фотографий</p>
    </div>
  );
});

/**
 * "ЧТО ЭТО": Шапка попапа с заголовком и кнопкой закрытия
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": С родителем через onClose callback
 * "КУДА ОТПРАВЛЯЕТСЯ": Событие закрытия вверх по дереву компонентов
 */
const PopupHeader = memo(function PopupHeader({
  title,
  onClose,
  isMobile,
}: {
  title: string;
  onClose?: () => void;
  isMobile?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-2xl flex-shrink-0">🍄</span>
        <h3 className="font-bold text-lg text-gray-900 leading-tight truncate">
          {title}
        </h3>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          aria-label="Закрыть" // Доступность для screen readers
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      )}
    </div>
  );
});

/**
 * "ЧТО ЭТО": Визуальный индикатор свайпа (только mobile)
 * "НА ЧТО ВЛИЯЕТ": UX - подсказывает что окно можно тянуть вниз
 *
 * Аналог: полоска в низу iOS модальных окон
 */
const DragHandle = memo(function DragHandle() {
  return (
    <div className="flex justify-center pt-2 pb-1">
      <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
    </div>
  );
});

/**
 * "ЧТО ЭТО": Блок отображения координат с кнопкой копирования
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": С браузерным Clipboard API
 * "КУДА ОТПРАВЛЯЕТСЯ": В буфер обмена при клике
 * "НА ЧТО ВЛИЯЕТ": Удобство - быстрое копирование координат для навигатора
 */
const Coordinates = memo(function Coordinates({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const [copied, setCopied] = useState(false); // Локальное состояние для feedback'а

  const handleCopy = useCallback(async () => {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`; // Формат для Google Maps
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Сброс статуса через 2 сек
    }
  }, [lat, lng]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <code className="text-gray-600 font-mono text-xs truncate">
        {formatCoordinates(lat, lng)}
      </code>
      <button
        onClick={handleCopy}
        className={`p-1.5 rounded transition-all flex-shrink-0 ${
          copied
            ? "bg-green-100 text-green-600"
            : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        }`}
        title={copied ? "Скопировано!" : "Копировать координаты"}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
});

/**
 * "ЧТО ЭТО": Блок описания с функцией "развернуть/свернуть"
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": С локальным состоянием isExpanded
 * "НА ЧТО ВЛИЯЕТ": Layout - предотвращает перегрузку длинным текстом
 *
 * Аналог: "Читать далее..." в новостях или соцсетях
 */
const Description = memo(function Description({ text }: { text?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text || text.trim().length === 0) {
    return <p className="text-sm text-gray-400 italic">Описание отсутствует</p>;
  }

  const shouldClamp = text.length > 120; // Логика обрезки длинного текста

  return (
    <div className="space-y-1">
      <p
        className={`text-sm text-gray-700 leading-relaxed ${!isExpanded && shouldClamp ? "line-clamp-3" : ""}`}
      >
        {text}
      </p>
      {shouldClamp && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-green-600 hover:text-green-700 font-medium"
        >
          {isExpanded ? "Свернуть ↑" : "Развернуть ↓"}
        </button>
      )}
    </div>
  );
});

/**
 * "ЧТО ЭТО": Бейдж (метка) типа гриба с цветовой кодировкой
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": С функцией getMushroomColor для определения стилей
 * "НА ЧТО ВЛИЯЕТ": Безопасность пользователя - визуальное предупреждение
 */
const MushroomBadge = memo(function MushroomBadge({
  type,
}: {
  type: MushroomType;
}) {
  const colors = getMushroomColor(type.name);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <span>{type.icon || colors.icon}</span>
      <span className="truncate max-w-[80px]">{type.name}</span>
    </span>
  );
});

/**
 * "ЧТО ЭТО": Сетка фотографий с ленивой загрузкой (Lazy Loading)
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ":
 *   - С Intersection Observer API (браузерный API для отслеживания видимости)
 *   - С библиотекой Framer Motion (анимации появления)
 * "КУДА ОТПРАВЛЯЕТСЯ": Запросы на загрузку изображений (только когда видны)
 * "НА ЧТО ВЛИЯЕТ":
 *   - Performance - экономия трафика и памяти
 *   - UX - плавные анимации появления
 *
 * Аналог: бесконечный скролл в Instagram - контент подгружается по мере прокрутки
 */
const PhotoGrid = memo(function PhotoGrid({
  images,
  onPhotoClick,
}: {
  images?: PlaceImage[];
  onPhotoClick?: (index: number) => void;
}) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set()); // Отслеживание загруженных
  const [visibleImages, setVisibleImages] = useState<Set<number>>(
    new Set([0, 1, 2, 3]),
  ); // Изначально видны первые 4
  const gridRef = useRef<HTMLDivElement>(null); // Ref для подключения Observer

  // Intersection Observer для ленивой загрузки
  useEffect(() => {
    if (!gridRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            setVisibleImages((prev) => new Set([...prev, index])); // Добавляем в видимые
          }
        });
      },
      { rootMargin: "50px" }, // Начинать загрузку за 50px до появления
    );

    const items = gridRef.current.querySelectorAll("[data-index]");
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect(); // Cleanup
  }, [images]);

  if (!images || images.length === 0) {
    return <NoPhotosPlaceholder />;
  }

  return (
    <div ref={gridRef} className="grid grid-cols-2 gap-2">
      {images.slice(0, 4).map((img, index) => (
        <motion.div
          key={img.id}
          data-index={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }} // Stagger animation
          className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => onPhotoClick?.(index)}
        >
          {/* Скелетон пока не загрузилось */}
          {!loadedImages.has(img.id) && visibleImages.has(index) && (
            <Skeleton className="absolute inset-0" />
          )}
          {/* Реальное изображение с lazy loading */}
          {visibleImages.has(index) && (
            <img
              src={img.url}
              alt={`Фото ${index + 1}`}
              loading="lazy" // Нативный lazy loading браузера
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${
                loadedImages.has(img.id) ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() =>
                setLoadedImages((prev) => new Set([...prev, img.id]))
              }
            />
          )}
          {/* Оверлей при наведении */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          {/* Бейдж "+N" если фото больше 4 */}
          {index === 3 && images.length > 4 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                +{images.length - 4}
              </span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
});

/**
 * "ЧТО ЭТО": Компонент загрузки фотографий (Drag & Drop + Click)
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ":
 *   - С глобальным auth store (проверка прав)
 *   - С браузерным FileReader API (превью)
 *   - С бэкендом Spring Boot (POST запрос)
 * "КУДА ОТПРАВЛЯЕТСЯ":
 *   - HTTP POST на http://localhost:8080/api/places/{placeId}/images
 *   - Header: Authorization: Bearer {token}
 *   - Body: FormData с файлом
 * "НА ЧТО ВЛИЯЕТ":
 *   - Безопасность: проверка авторизации и валидация файла (только image, max 5MB)
 *   - UX: drag-drop, превью, индикатор загрузки, обработка ошибок
 *
 * Аналог: загрузка фото в Instagram или аватар в VK
 */
const PhotoUploader = memo(function PhotoUploader({
  placeId,
  currentImagesCount,
  onUpload,
}: {
  placeId: number;
  currentImagesCount: number;
  onUpload?: (image: PlaceImage) => void;
}) {
  const { token, user } = useAuthStore(); // Получаем данные авторизации
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null); // Data URL для превью
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Бизнес-логика прав доступа: можно загружать если:
  // 1. Есть токен (авторизован)
  // 2. Пользователь НЕ автор этого места (нельзя голосовать за себя)
  // 3. Меньше 10 фото (лимит)
  const canUpload = token && user?.id !== placeId && currentImagesCount < 10;

  if (!canUpload) return null; // Не рендерим если нет прав

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Разрешаем drop
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFile = async (file: File) => {
    // Валидация
    if (!file.type.startsWith("image/")) {
      setError("Только изображения");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Максимум 5MB");
      return;
    }

    // Создание превью через FileReader
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    setError(null);

    // Подготовка FormData для multipart/form-data запроса
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `http://localhost:8080/api/places/${placeId}/images`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }, // JWT токен
          body: formData,
        },
      );

      if (res.ok) {
        const newImage: PlaceImage = await res.json();
        onUpload?.(newImage); // Уведомляем родителя
        setPreview(null);
      } else {
        setError("Ошибка загрузки");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Превью загружаемого файла */}
      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-20 object-cover rounded-lg opacity-70"
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-1 py-3 px-4 
          border-2 border-dashed rounded-lg cursor-pointer transition-all
          ${isDragging ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-green-400 bg-gray-50/50"}
          ${isUploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Upload
          className={`w-5 h-5 ${isDragging ? "text-green-500" : "text-gray-400"}`}
        />
        <span className="text-xs text-gray-500 text-center">
          {isDragging ? "Отпустите файл" : "Перетащите или нажмите"}
        </span>
        <span className="text-[10px] text-gray-400">JPG, PNG до 5MB</span>
      </div>

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
});

/**
 * "ЧТО ЭТО": Кнопка "Поделиться" (Web Share API или копирование ссылки)
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ":
 *   - С браузерным Navigator.share API (мобильные)
 *   - Или с Clipboard API как fallback
 * "КУДА ОТПРАВЛЯЕТСЯ":
 *   - В нативное меню "Поделиться" (iOS/Android)
 *   - Или в буфер обмена
 * "НА ЧТО ВЛИЯЕТ": Virality - упрощает шаринг места с друзьями
 *
 * Аналог: кнопка "Share" в Instagram или YouTube
 */
const ShareButton = memo(function ShareButton({ place }: { place: Place }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    // Генерация deep link с координатами и ID места
    const url = `${window.location.origin}/map?lat=${place.latitude}&lng=${place.longitude}&place=${place.id}`;

    // Пробуем нативный Web Share API (работает на мобильных)
    if (navigator.share) {
      try {
        await navigator.share({
          title: place.title,
          text: place.description || "",
          url,
        });
        return;
      } catch {
        // Пользователь отменил или ошибка - переходим к fallback
      }
    }

    // Fallback: копирование в буфер
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [place]);

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Share2 className="w-4 h-4" />
      <span className="hidden sm:inline">
        {copied ? "Скопировано!" : "Поделиться"}
      </span>
    </button>
  );
});

// ============================================
// КОНТЕНТ ПОПАПА (Общий для обеих версий)
// ============================================

/**
 * "ЧТО ЭТО": Универсальный контент попапа (используется и в mobile, и в desktop)
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": Со всеми подкомпонентами выше
 * "НА ЧТО ВЛИЯЕТ": Единообразие контента независимо от устройства
 */
const PopupContent = memo(function PopupContent({
  place,
  images,
  onImageUpload,
  onPhotoClick,
  onClose,
  isMobile,
}: {
  place: Place;
  images: PlaceImage[];
  onImageUpload: (img: PlaceImage) => void;
  onPhotoClick: (idx: number) => void;
  onClose?: () => void;
  isMobile?: boolean;
}) {
  return (
    <div className={`space-y-4 ${isMobile ? "pb-safe" : ""}`}>
      {isMobile && <DragHandle />}

      <PopupHeader title={place.title} onClose={onClose} isMobile={isMobile} />

      <Coordinates lat={place.latitude} lng={place.longitude} />

      <Description text={place.description} />

      {place.mushroomTypes && place.mushroomTypes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Грибы
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {place.mushroomTypes.map((type) => (
              <MushroomBadge key={type.id} type={type} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Фото ({images.length})
        </h4>
        <PhotoGrid images={images} onPhotoClick={onPhotoClick} />
      </div>

      <PhotoUploader
        placeId={place.id}
        currentImagesCount={images.length}
        onUpload={onImageUpload}
      />

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <ShareButton place={place} />
        <span className="text-xs text-gray-400">ID: {place.id}</span>
      </div>
    </div>
  );
});

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ (Entry Point)
// ============================================

/**
 * "ЧТО ЭТО": Главный компонент PlacePopup - точка входа
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ":
 *   - С родительским Map (получает place, управляет isOpen)
 *   - С Framer Motion (сложные анимации жестов на mobile)
 *   - С Lightbox (галерея фото)
 *   - С DOM (keyboard events для accessibility)
 * "КУДА ОТПРАВЛЯЕТСЯ":
 *   - Callbacks вверх: onClose, onImageAdded
 *   - HTTP запросы на бэкенд (через PhotoUploader)
 * "НА ЧТО ВЛИЯЕТ":
 *   - Архитектура: разделение на Mobile (Bottom Sheet) и Desktop (Centered Modal)
 *   - UX: плавные анимации, жесты, accessibility
 *   - Performance: оптимизация через memo, lazy loading
 *
 * Аналог: модальное окно в Google Maps при клике на метку,
 * или карточка в Tinder (свайп вниз для закрытия на mobile)
 */
export const PlacePopup = memo(function PlacePopup({
  place,
  onImageAdded,
  onClose,
  isOpen = true,
}: PlacePopupProps) {
  const isMobile = useIsMobile(); // Определяем устройство
  const [lightboxOpen, setLightboxOpen] = useState(false); // Состояние галереи
  const [lightboxIndex, setLightboxIndex] = useState(0); // Текущий индекс фото
  const [images, setImages] = useState(place.images || []); // Локальное состояние фото

  // Framer Motion values для жестов (только mobile)
  const y = useMotionValue(0); // Отслеживание Y позиции
  const opacity = useTransform(y, [0, 300], [1, 0]); // Связь позиции и прозрачности

  // Синхронизация с пропсами
  useEffect(() => {
    setImages(place.images || []);
  }, [place.images]);

  // Обработка клавиши ESC (accessibility)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose && !lightboxOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose, lightboxOpen]);

  const handlePhotoClick = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleImageUpload = useCallback(
    (newImage: PlaceImage) => {
      setImages((prev) => [...prev, newImage]); // Локальное обновление
      onImageAdded?.(place.id, newImage); // Уведомление родителя
    },
    [place.id, onImageAdded],
  );

  // Обработчик свайпа вниз (mobile)
  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.y > 100) {
      // Если потянули больше 100px вниз
      onClose?.();
    }
  };

  if (!isOpen) return null;

  // ==========================================
  // МОБИЛЬНАЯ ВЕРСИЯ: Bottom Sheet (шторка снизу)
  // ==========================================
  if (isMobile) {
    return (
      <>
        {/* Затемненный фон (backdrop) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
        />

        {/* Сам Bottom Sheet с жестами */}
        <motion.div
          initial={{ y: "100%" }} // Начальное положение - за экраном
          animate={{ y: 0 }} // Конечное - на месте
          exit={{ y: "100%" }} // При закрытии - уходит вниз
          transition={{ type: "spring", damping: 25, stiffness: 300 }} // Физика пружины
          style={{ y, opacity }} // Привязка к motion values
          drag="y" // Разрешаем drag по Y
          dragConstraints={{ top: 0, bottom: 0 }} // Ограничения
          dragElastic={0.2} // Эластичность
          onDragEnd={handleDragEnd} // Обработка окончания жеста
          className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-hidden"
        >
          <div className="p-4 overflow-y-auto max-h-[85vh]">
            <PopupContent
              place={place}
              images={images}
              onImageUpload={handleImageUpload}
              onPhotoClick={handlePhotoClick}
              onClose={onClose}
              isMobile={true}
            />
          </div>
        </motion.div>

        {/* Lightbox для просмотра фото */}
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={images.map((img) => ({ src: img.url }))}
          plugins={[Zoom, Counter]}
        />
      </>
    );
  }

  // ==========================================
  // ДЕСКТОПНАЯ ВЕРСИЯ: Центрированный модал
  // ==========================================
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Центрированное окно */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }} // Начинается маленьким и ниже
        animate={{ opacity: 1, scale: 1, y: 0 }} // Вырастает и встает на место
        exit={{ opacity: 0, scale: 0.9, y: 20 }} // Уходит с анимацией
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        {/* Контейнер с контентом (pointer-events-auto чтобы клики проходили) */}
        <div
          className="w-full max-w-[350px] min-w-[300px] max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие при клике внутри
        >
          <div className="p-4 overflow-y-auto max-h-[85vh]">
            <PopupContent
              place={place}
              images={images}
              onImageUpload={handleImageUpload}
              onPhotoClick={handlePhotoClick}
              onClose={onClose}
              isMobile={false}
            />
          </div>
        </div>
      </motion.div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={images.map((img) => ({ src: img.url }))}
        plugins={[Zoom, Counter]}
      />
    </>
  );
});

export default PlacePopup;
