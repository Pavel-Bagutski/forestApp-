"use client";

import { useState, useRef } from "react";
import { useAuthStore } from "@/store/authStore";

interface ImageUploadProps {
  placeId: number;
  onUpload: (image: { id: number; url: string }) => void;
}

export default function ImageUpload({ placeId, onUpload }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuthStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валидация
    if (!file.type.startsWith("image/")) {
      alert("Пожалуйста, выберите изображение");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой (максимум 5MB)");
      return;
    }

    // Превью
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Загрузка
    setIsUploading(true);
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
        throw new Error(error.error || "Ошибка загрузки");
      }

      const data = await res.json();
      onUpload({ id: data.id, url: data.url });
      setPreview(null);
      alert("✅ Фото загружено!");
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div className="animate-spin text-white text-2xl">⏳</div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
      >
        {isUploading ? "Загрузка..." : "📷 Загрузить фото"}
      </button>

      <p className="text-xs text-gray-500 text-center">JPG, PNG, WebP до 5MB</p>
    </div>
  );
}
