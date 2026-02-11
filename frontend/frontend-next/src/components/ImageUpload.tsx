"use client";

import { useState, useRef, memo } from "react";
import { useAuthStore } from "@/store/authStore";

interface PlaceImage {
  id: number;
  url: string;
  uploadedAt?: string;
}

interface ImageUploadProps {
  placeId: number;
  onUpload: (image: PlaceImage) => void;
}

const ImageUpload = memo(function ImageUpload({
  placeId,
  onUpload,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuthStore();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !token) {
      if (!token) alert("Войдите в систему");
      return;
    }

    setIsUploading(true);

    for (const file of files) {
      // Валидация на фронтенде
      if (!file.type.startsWith("image/")) {
        alert(`${file.name}: Пожалуйста, выберите изображение`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}: Файл слишком большой (максимум 5MB)`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        console.log(
          `Uploading ${file.name} to ${API_URL}/api/places/${placeId}/images`,
        );

        const res = await fetch(`${API_URL}/api/places/${placeId}/images`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // НЕ устанавливаем Content-Type — браузер сам установит с boundary для FormData
          },
          body: formData,
        });

        console.log("Response status:", res.status);

        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("Upload success:", data);

        onUpload({
          id: data.id || Date.now(),
          url: data.url,
          uploadedAt: data.uploadedAt,
        });
      } catch (err: any) {
        console.error(`Upload error for ${file.name}:`, err);
        alert(`❌ ${file.name}: ${err.message || "Ошибка загрузки"}`);
      }
    }

    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="w-full py-2 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 transition"
      >
        {isUploading ? "⏳ Загрузка..." : "📷 Добавить фото"}
      </button>
      <p className="text-xs text-gray-400 text-center mt-1">
        JPG, PNG, WebP до 5MB
      </p>
    </div>
  );
});

export default ImageUpload;
