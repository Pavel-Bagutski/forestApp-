"use client";

import { useState, useEffect, useCallback, memo, useRef } from "react";
import { Place, PlaceImage, MushroomType } from "./Map";
import { useAuthStore } from "@/store/authStore";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { X, Copy, Share2, MapPin, ImageIcon, Upload, Check, GripHorizontal } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/plugins/counter.css";

// ============================================
// ТИПЫ
// ============================================
interface PlacePopupProps {
  place: Place;
  onImageAdded?: (placeId: number, image: PlaceImage) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

// ============================================
// УТИЛИТЫ
// ============================================

/** Форматирование координат: 55.7558° N, 37.6173° E */
function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/** Копирование в буфер обмена */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Хук для определения мобильного экрана */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

/** Цвета для типов грибов */
const getMushroomColor = (name: string): { bg: string; text: string; border: string; icon: string } => {
  const lower = name.toLowerCase();
  if (lower.includes("белый") || lower.includes("боровик") || lower.includes("подосиновик") || lower.includes("лисичк")) {
    return { bg: "bg-green-100", text: "text-green-800", border: "border-green-300", icon: "✅" };
  }
  if (lower.includes("мухомор") || lower.includes("бледная") || lower.includes("паутинник")) {
    return { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", icon: "☠️" };
  }
  if (lower.includes("сыроежка") || lower.includes("груздь") || lower.includes("волнушк")) {
    return { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", icon: "⚠️" };
  }
  return { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300", icon: "🍄" };
};

// ============================================
// ПОДКОМПОНЕНТЫ
// ============================================

const Skeleton = memo(function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
});

const NoPhotosPlaceholder = memo(function NoPhotosPlaceholder() {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
      <ImageIcon className="w-12 h-12 text-gray-300 mb-2" />
      <p className="text-sm text-gray-400">Нет фотографий</p>
    </div>
  );
});

/** Шапка попапа */
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
        <h3 className="font-bold text-lg text-gray-900 leading-tight truncate">{title}</h3>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      )}
    </div>
  );
});

/** Ручка для свайпа на мобильных */
const DragHandle = memo(function DragHandle() {
  return (
    <div className="flex justify-center pt-2 pb-1">
      <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
    </div>
  );
});

/** Координаты с копированием */
const Coordinates = memo(function Coordinates({ lat, lng }: { lat: number; lng: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          copied ? "bg-green-100 text-green-600" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        }`}
        title={copied ? "Скопировано!" : "Копировать координаты"}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
});

/** Описание с line-clamp */
const Description = memo(function Description({ text }: { text?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text || text.trim().length === 0) {
    return <p className="text-sm text-gray-400 italic">Описание отсутствует</p>;
  }

  const shouldClamp = text.length > 120;

  return (
    <div className="space-y-1">
      <p className={`text-sm text-gray-700 leading-relaxed ${!isExpanded && shouldClamp ? "line-clamp-3" : ""}`}>
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

/** Бейдж типа гриба */
const MushroomBadge = memo(function MushroomBadge({ type }: { type: MushroomType }) {
  const colors = getMushroomColor(type.name);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${colors.bg} ${colors.text} ${colors.border}`}>
      <span>{type.icon || colors.icon}</span>
      <span className="truncate max-w-[80px]">{type.name}</span>
    </span>
  );
});

/** Grid фотографий с ленивой загрузкой */
const PhotoGrid = memo(function PhotoGrid({
  images,
  onPhotoClick,
}: {
  images?: PlaceImage[];
  onPhotoClick?: (index: number) => void;
}) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [visibleImages, setVisibleImages] = useState<Set<number>>(new Set([0, 1, 2, 3]));
  const gridRef = useRef<HTMLDivElement>(null);

  // Intersection Observer для ленивой загрузки
  useEffect(() => {
    if (!gridRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            setVisibleImages((prev) => new Set([...prev, index]));
          }
        });
      },
      { rootMargin: "50px" }
    );

    const items = gridRef.current.querySelectorAll("[data-index]");
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
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
          transition={{ delay: index * 0.05 }}
          className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => onPhotoClick?.(index)}
        >
          {!loadedImages.has(img.id) && visibleImages.has(index) && (
            <Skeleton className="absolute inset-0" />
          )}
          {visibleImages.has(index) && (
            <img
              src={img.url}
              alt={`Фото ${index + 1}`}
              loading="lazy"
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${
                loadedImages.has(img.id) ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setLoadedImages((prev) => new Set([...prev, img.id]))}
            />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          {index === 3 && images.length > 4 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold text-xl">+{images.length - 4}</span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
});

/** Загрузка фото */
const PhotoUploader = memo(function PhotoUploader({
  placeId,
  currentImagesCount,
  onUpload,
}: {
  placeId: number;
  currentImagesCount: number;
  onUpload?: (image: PlaceImage) => void;
}) {
  const { token, user } = useAuthStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Проверка прав: авторизован и не автор места
  const canUpload = token && user?.id !== placeId && currentImagesCount < 10;

  if (!canUpload) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
    if (!file.type.startsWith("image/")) {
      setError("Только изображения");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Максимум 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`http://localhost:8080/api/places/${placeId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const newImage: PlaceImage = await res.json();
        onUpload?.(newImage);
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
      {preview && (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full h-20 object-cover rounded-lg opacity-70" />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

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
        <Upload className={`w-5 h-5 ${isDragging ? "text-green-500" : "text-gray-400"}`} />
        <span className="text-xs text-gray-500 text-center">
          {isDragging ? "Отпустите файл" : "Перетащите или нажмите"}
        </span>
        <span className="text-[10px] text-gray-400">JPG, PNG до 5MB</span>
      </div>

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
});

/** Кнопка поделиться */
const ShareButton = memo(function ShareButton({ place }: { place: Place }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/map?lat=${place.latitude}&lng=${place.longitude}&place=${place.id}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: place.title, text: place.description || "", url });
        return;
      } catch {}
    }

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
      <span className="hidden sm:inline">{copied ? "Скопировано!" : "Поделиться"}</span>
    </button>
  );
});

// ============================================
// КОНТЕНТ ПОПАПА (общий для desktop и mobile)
// ============================================
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
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Грибы</h4>
          <div className="flex flex-wrap gap-1.5">
            {place.mushroomTypes.map((type) => (
              <MushroomBadge key={type.id} type={type} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Фото ({images.length})</h4>
        <PhotoGrid images={images} onPhotoClick={onPhotoClick} />
      </div>

      <PhotoUploader placeId={place.id} currentImagesCount={images.length} onUpload={onImageUpload} />

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <ShareButton place={place} />
        <span className="text-xs text-gray-400">ID: {place.id}</span>
      </div>
    </div>
  );
});

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================
export const PlacePopup = memo(function PlacePopup({
  place,
  onImageAdded,
  onClose,
  isOpen = true,
}: PlacePopupProps) {
  const isMobile = useIsMobile();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [images, setImages] = useState(place.images || []);
  
  // Для bottom sheet на мобильных
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  useEffect(() => {
    setImages(place.images || []);
  }, [place.images]);

  // Закрытие по ESC
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
      setImages((prev) => [...prev, newImage]);
      onImageAdded?.(place.id, newImage);
    },
    [place.id, onImageAdded]
  );

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose?.();
    }
  };

  if (!isOpen) return null;

  // МОБИЛЬНАЯ ВЕРСИЯ: Bottom Sheet
  if (isMobile) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
        />

        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{ y, opacity }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
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

  // ДЕСКТОПНАЯ ВЕРСИЯ: Центрированный попап
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-[350px] min-w-[300px] max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
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
