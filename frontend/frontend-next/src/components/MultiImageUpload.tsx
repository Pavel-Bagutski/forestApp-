"use client";

import { useState, useRef } from "react";

interface MultiImageUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}

export default function MultiImageUpload({
  onFilesChange,
  maxFiles = 5,
}: MultiImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    // Валидация
    const validFiles = selectedFiles.filter((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} не является изображением`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} слишком большой (макс 5MB)`);
        return false;
      }
      return true;
    });

    const totalFiles = files.length + validFiles.length;
    if (totalFiles > maxFiles) {
      alert(`Максимум ${maxFiles} фотографий`);
      return;
    }

    // Создание превью
    const newPreviews: string[] = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === validFiles.length) {
          setPreviews([...previews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    const updatedFiles = [...files, ...validFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Фотографии (до {maxFiles}):
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length < maxFiles && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-sm text-gray-600"
        >
          📷 Добавить фото ({files.length}/{maxFiles})
        </button>
      )}

      <p className="text-xs text-gray-500">JPG, PNG, WebP до 5MB каждое</p>
    </div>
  );
}
