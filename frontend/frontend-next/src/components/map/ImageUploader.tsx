"use client";

import { useState, useRef, memo } from "react";
import type { PlaceImage } from "@/types";

interface Props {
  placeId: number;
  onUpload: (image: PlaceImage) => void;
  token: string | null;
}

export const ImageUpload = memo(function ImageUpload({
  placeId,
  onUpload,
  token,
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !token) return;

    setIsUploading(true);

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name}: выберите изображение`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}: файл слишком большой`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/places/${placeId}/images`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );

        if (!res.ok) throw new Error("Ошибка загрузки");

        const data = await res.json();
        onUpload({ id: data.id, url: data.url });
      } catch (err: any) {
        alert(`❌ ${file.name}: ${err.message}`);
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
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="w-full py-2 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isUploading ? "⏳ Загрузка..." : "📷 Добавить фото"}
      </button>
    </div>
  );
});
