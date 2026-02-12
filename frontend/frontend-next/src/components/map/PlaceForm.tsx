"use client";

import { useState, memo } from "react";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import type { Place, PlaceImage, MushroomType } from "@/types";

interface Props {
  lat: number;
  lng: number;
  mushroomTypes: MushroomType[];
  token: string | null;
  onSubmit: (data: any) => Promise<Place>;
  onCancel: () => void;
  onImageAdded?: (placeId: number, image: PlaceImage) => void;
}

export const PlaceForm = memo(function PlaceForm({
  lat,
  lng,
  mushroomTypes,
  token,
  onSubmit,
  onCancel,
  onImageAdded,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mushroomTypeId, setMushroomTypeId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { address, isLoading: isLoadingAddress } = useReverseGeocode(lat, lng);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return alert("Войдите в систему");

    setIsSubmitting(true);
    try {
      const place = await onSubmit({
        title,
        description,
        address,
        latitude: lat,
        longitude: lng,
        mushroomTypeId: mushroomTypeId ? parseInt(mushroomTypeId) : undefined,
      });
      // ... сброс формы
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-72 p-2">
      <h3 className="font-bold mb-3">🍄 Новое место</h3>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название *"
        className="w-full border p-2 mb-2 rounded"
        required
      />

      <select
        value={mushroomTypeId}
        onChange={(e) => setMushroomTypeId(e.target.value)}
        className="w-full border p-2 mb-2 rounded"
      >
        <option value="">Тип гриба</option>
        {mushroomTypes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <input
        value={address}
        readOnly
        placeholder="Адрес..."
        className="w-full border p-2 mb-2 rounded bg-gray-50"
      />
      {isLoadingAddress && <span>⏳</span>}

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание"
        className="w-full border p-2 mb-2 rounded h-20"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title || isSubmitting}
          className="flex-1 bg-green-600 text-white p-2 rounded"
        >
          {isSubmitting ? "..." : "Добавить"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-300 p-2 rounded"
        >
          Отмена
        </button>
      </div>
    </form>
  );
});
