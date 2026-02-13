"use client";

import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { X, MapPin, Plus, Upload, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { MushroomType, EdibilityCategory } from "@/api/mushroomTypeApi";

// ============================================
// ТИПЫ
// ============================================
export interface PlaceImage {
  id: number;
  url: string;
}

interface NewPlacePopupProps {
  lat: number;
  lng: number;
  isOpen: boolean;
  onClose: () => void;
  mushroomTypes: MushroomType[];
  onSubmit: (data: {
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    images: File[];
    mushroomTypeIds: number[];
    newMushroomTypes: { name: string; category?: EdibilityCategory }[];
  }) => Promise<void>;
}

// ============================================
// КОМПОНЕНТ
// ============================================
export const NewPlacePopup = memo(function NewPlacePopup({
  lat,
  lng,
  isOpen,
  onClose,
  mushroomTypes,
  onSubmit,
}: NewPlacePopupProps) {
  const { token } = useAuthStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string }[]>([]);
  const [selectedMushroomIds, setSelectedMushroomIds] = useState<number[]>([]);
  const [newMushrooms, setNewMushrooms] = useState<{ name: string; category?: EdibilityCategory }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const MAX_IMAGES = 10;
  const canAddMoreImages = selectedFiles.length < MAX_IMAGES;

  // Сброс формы
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setSelectedFiles([]);
      setSelectedMushroomIds([]);
      setNewMushrooms([]);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // ==========================================
  // ОБРАБОТЧИКИ ГРИБОВ
  // ==========================================
  const toggleMushroomType = (typeId: number) => {
    setSelectedMushroomIds((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const removeSelectedMushroom = (typeId: number) => {
    setSelectedMushroomIds((prev) => prev.filter((id) => id !== typeId));
  };

  const addNewMushroom = (name: string, category: EdibilityCategory) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (newMushrooms.some((m) => m.name.toLowerCase() === trimmedName.toLowerCase())) return;
    setNewMushrooms((prev) => [...prev, { name: trimmedName, category }]);
  };

  const removeNewMushroom = (index: number) => {
    setNewMushrooms((prev) => prev.filter((_, i) => i !== index));
  };

  const getCategoryColor = (category?: EdibilityCategory) => {
    switch (category) {
      case "EDIBLE":
        return "bg-green-100 text-green-800 border-green-300";
      case "CONDITIONALLY_EDIBLE":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "POISONOUS":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getCategoryIcon = (category?: EdibilityCategory) => {
    switch (category) {
      case "EDIBLE":
        return "✅";
      case "CONDITIONALLY_EDIBLE":
        return "⚠️";
      case "POISONOUS":
        return "☠️";
      default:
        return "❓";
    }
  };

  // ==========================================
  // ОБРАБОТЧИКИ ФОТО (множественная загрузка)
  // ==========================================
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const validFiles = imageFiles.filter((file) => file.size <= 5 * 1024 * 1024);

    if (validFiles.length !== imageFiles.length) {
      alert("Некоторые файлы пропущены: только изображения до 5MB");
    }

    const remainingSlots = MAX_IMAGES - selectedFiles.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFiles((prev) => [...prev, { file, preview: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const removeImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // ОТПРАВКА ФОРМЫ
  // ==========================================
  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        latitude: lat,
        longitude: lng,
        images: selectedFiles.map((item) => item.file),
        mushroomTypeIds: selectedMushroomIds,
        newMushroomTypes: newMushrooms,
      });

      onClose();
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Неавторизован
  if (!token) {
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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-[350px] bg-white rounded-2xl shadow-2xl p-6 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="font-bold text-lg mb-2">Требуется вход</h3>
            <p className="text-gray-600 mb-4">Войдите, чтобы добавлять места</p>
            <a href="/login" className="block w-full bg-green-600 text-white py-3 rounded-lg font-medium">
              Войти
            </a>
          </div>
        </motion.div>
      </>
    );
  }

  // Форма создания
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-[400px] max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 space-y-4 overflow-y-auto max-h-[90vh]">
            {/* Шапка */}
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍄</span>
                <h3 className="font-bold text-lg">Новое место</h3>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Координаты */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <code className="text-xs">
                {Math.abs(lat).toFixed(4)}° {lat >= 0 ? "N" : "S"},{" "}
                {Math.abs(lng).toFixed(4)}° {lng >= 0 ? "E" : "W"}
              </code>
            </div>

            {/* Поля формы */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 uppercase font-semibold">Название *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Боровиковая поляна"
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase font-semibold">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Как добраться, что растёт..."
                  rows={3}
                  className="w-full p-2.5 border rounded-lg text-sm resize-none"
                />
              </div>
            </div>

            {/* МНОЖЕСТВЕННАЯ ЗАГРУЗКА ФОТО */}
            <div className="border-t pt-3">
              <label className="text-xs text-gray-500 uppercase font-semibold block mb-2">
                Фотографии ({selectedFiles.length}/{MAX_IMAGES})
              </label>

              {/* Сетка превью */}
              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {selectedFiles.map((item, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={item.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-16 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        type="button"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dropzone */}
              {canAddMoreImages && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    flex flex-col items-center justify-center gap-1 py-4 px-4 
                    border-2 border-dashed rounded-lg cursor-pointer transition-all
                    ${isDragging ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-green-400 bg-gray-50/50"}
                  `}
                >
                  <label className="flex flex-col items-center cursor-pointer w-full">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                    <Upload className={`w-6 h-6 mb-1 ${isDragging ? "text-green-500" : "text-gray-400"}`} />
                    <span className="text-xs text-gray-500 text-center">
                      {isDragging ? "Отпустите файлы" : "Нажмите или перетащите фото"}
                    </span>
                    <span className="text-[10px] text-gray-400">JPG, PNG, WebP до 5MB</span>
                  </label>
                </div>
              )}
            </div>

            {/* ВЫБОР ГРИБОВ */}
            <div className="border-t pt-3">
              <label className="text-xs text-gray-500 uppercase font-semibold block mb-2">Грибы</label>

              {/* Выбранные грибы */}
              {(selectedMushroomIds.length > 0 || newMushrooms.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedMushroomIds.map((typeId) => {
                    const type = mushroomTypes.find((t) => t.id === typeId);
                    if (!type) return null;
                    return (
                      <span
                        key={type.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getCategoryColor(type.category)}`}
                      >
                        {getCategoryIcon(type.category)} {type.name}
                        <button
                          onClick={() => removeSelectedMushroom(type.id)}
                          className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
                          type="button"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {newMushrooms.map((mushroom, index) => (
                    <span
                      key={`new-${index}`}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getCategoryColor(mushroom.category)}`}
                    >
                      {getCategoryIcon(mushroom.category)} {mushroom.name}
                      <span className="text-[10px] opacity-60">(новый)</span>
                      <button
                        onClick={() => removeNewMushroom(index)}
                        className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
                        type="button"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Список грибов для выбора */}
              <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                {mushroomTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleMushroomType(type.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                      selectedMushroomIds.includes(type.id)
                        ? getCategoryColor(type.category) + " font-medium"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="mr-1">{getCategoryIcon(type.category)}</span>
                    {type.name}
                    {selectedMushroomIds.includes(type.id) && <span className="float-right">✓</span>}
                  </button>
                ))}
              </div>

              {/* Добавление нового гриба */}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Новый гриб..."
                  className="flex-1 px-2 py-1.5 text-sm border rounded"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      addNewMushroom(input.value, "EDIBLE");
                      input.value = "";
                    }
                  }}
                />
                <select
                  className="px-2 py-1.5 text-sm border rounded"
                  onChange={(e) => {
                    const input = e.target.previousElementSibling as HTMLInputElement;
                    if (input.value) {
                      addNewMushroom(input.value, e.target.value as EdibilityCategory);
                      input.value = "";
                    }
                  }}
                >
                  <option value="EDIBLE">✅ Съедобный</option>
                  <option value="CONDITIONALLY_EDIBLE">⚠️ Условно</option>
                  <option value="POISONOUS">☠️ Ядовитый</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Новый гриб..."]') as HTMLInputElement;
                    const select = input?.nextElementSibling as HTMLSelectElement;
                    if (input?.value) {
                      addNewMushroom(input.value, (select?.value as EdibilityCategory) || "EDIBLE");
                      input.value = "";
                    }
                  }}
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-2 pt-2 border-t">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || isSubmitting}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                {isSubmitting ? "Создание..." : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
});

export default NewPlacePopup;
