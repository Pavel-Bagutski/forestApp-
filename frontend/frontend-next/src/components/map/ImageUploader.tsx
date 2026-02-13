"use client";

import { useState, useRef, memo } from "react";
import { useAuthStore } from "@/store/authStore";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// ТИПЫ
// ============================================
interface PlaceImage {
  id: number;
  url: string;
}

interface ImageUploadProps {
  placeId: number;
  onUpload: (images: PlaceImage[]) => void; // ← Массив вместо одного
  maxFiles?: number; // ← Лимит файлов
  existingCount?: number; // ← Сколько уже есть
}

// ============================================
// КОМПОНЕНТ
// ============================================
export const ImageUpload = memo(function ImageUpload({
  placeId,
  onUpload,
  maxFiles = 10,
  existingCount = 0,
}: ImageUploadProps) {
  // Состояния
  const [isUploading, setIsUploading] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuthStore();

  // Сколько можно загрузить ещё
  const remainingSlots = maxFiles - existingCount - previews.length;
  const canUploadMore = remainingSlots > 0 && !isUploading;

  // ==========================================
  // ВАЛИДАЦИЯ ФАЙЛА
  // ==========================================
  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("image/")) {
      return `"${file.name}" не является изображением`;
    }
    if (file.size > 5 * 1024 * 1024) {
      return `"${file.name}" слишком большой (макс. 5MB)`;
    }
    return null;
  };

  // ==========================================
  // ВЫБОР ФАЙЛОВ (множественный)
  // ==========================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Проверка лимита
    if (files.length > remainingSlots) {
      alert(`Можно загрузить ещё ${remainingSlots} фото`);
      return;
    }

    // Валидация всех файлов
    const errors: string[] = [];
    const validFiles: File[] = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      alert(errors.join("\n"));
      if (validFiles.length === 0) return;
    }

    // Создание превью
    const newPreviews: { file: File; url: string }[] = [];

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        newPreviews.push({ file, url });

        // Когда все превью готовы - обновляем state
        if (newPreviews.length === validFiles.length) {
          setPreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Очистка input
    if (inputRef.current) inputRef.current.value = "";
  };

  // ==========================================
  // УДАЛЕНИЕ ИЗ ПРЕВЬЮ
  // ==========================================
  const removePreview = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // ЗАГРУЗКА НА СЕРВЕР (последовательная)
  // ==========================================
  const handleUpload = async () => {
    if (previews.length === 0 || !token) return;

    setIsUploading(true);
    setUploadProgress(0);

    const uploadedImages: PlaceImage[] = [];
    const errors: string[] = [];

    // Загружаем последовательно
    for (let i = 0; i < previews.length; i++) {
      const { file } = previews[i];

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(
          `http://localhost:8080/api/places/${placeId}/images`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || `Ошибка загрузки ${file.name}`);
        }

        const data = await res.json();
        uploadedImages.push({ id: data.id, url: data.url });
        setUploadProgress(((i + 1) / previews.length) * 100);
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    setIsUploading(false);

    // Результат
    if (uploadedImages.length > 0) {
      onUpload(uploadedImages);
      setPreviews([]);
      alert(`✅ Загружено ${uploadedImages.length} из ${previews.length} фото`);
    }

    if (errors.length > 0) {
      alert("❌ Ошибки:\n" + errors.join("\n"));
    }
  };

  // ==========================================
  // ОТМЕНА ВСЕГО
  // ==========================================
  const handleCancel = () => {
    setPreviews([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="space-y-3">
      {/* Заголовок с счётчиком */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          Фото: {existingCount} / {maxFiles}
        </span>
        {previews.length > 0 && (
          <span className="text-green-600 font-medium">
            +{previews.length} готово к загрузке
          </span>
        )}
      </div>

      {/* Полоса прогресса */}
      {isUploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Сетка превью */}
      <AnimatePresence>
        {previews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-3 gap-2"
          >
            {previews.map((preview, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative aspect-square rounded-lg overflow-hidden group"
              >
                <img
                  src={preview.url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {!isUploading && (
                  <button
                    onClick={() => removePreview(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопки действий */}
      <div className="flex gap-2">
        {/* Кнопка выбора файлов */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={!canUploadMore}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 border-dashed transition-all ${
            canUploadMore
              ? "border-gray-300 hover:border-green-500 hover:bg-green-50 text-gray-600"
              : "border-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm">
            {canUploadMore
              ? `Выбрать фото (${remainingSlots})`
              : "Лимит достигнут"}
          </span>
        </button>

        {/* Кнопка загрузки (если есть превью) */}
        {previews.length > 0 && !isUploading && (
          <>
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={handleUpload}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              <span>Загрузить ({previews.length})</span>
            </button>
          </>
        )}
      </div>

      {/* Скрытый input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple // ← ← ← МНОЖЕСТВЕННЫЙ ВЫБОР!
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Подсказка */}
      <p className="text-xs text-gray-500 text-center">
        JPG, PNG, WebP до 5MB каждый
      </p>
    </div>
  );
});

export default ImageUpload;
