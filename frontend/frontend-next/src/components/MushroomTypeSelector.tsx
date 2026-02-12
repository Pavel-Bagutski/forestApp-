"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { MushroomType, EdibilityCategory } from "@/types/mushroom";

interface MushroomTypeSelectorProps {
  selectedTypes: number[];
  onChange: (typeIds: number[]) => void;
}

export default function MushroomTypeSelector({
  selectedTypes,
  onChange,
}: MushroomTypeSelectorProps) {
  const [types, setTypes] = useState<MushroomType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/mushroom-types")
      .then((res) => setTypes(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getCategoryColor = (category?: EdibilityCategory) => {
    switch (category) {
      case "EDIBLE":
        return "bg-green-100 border-green-300 text-green-800";
      case "CONDITIONALLY_EDIBLE":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "POISONOUS":
        return "bg-red-100 border-red-300 text-red-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
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

  const toggleType = (typeId: number) => {
    if (selectedTypes.includes(typeId)) {
      onChange(selectedTypes.filter((id) => id !== typeId));
    } else {
      onChange([...selectedTypes, typeId]);
    }
  };

  if (loading)
    return <div className="text-sm text-gray-500">Загрузка видов...</div>;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Виды грибов:
      </label>
      <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
        {types.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => toggleType(type.id)}
            className={`w-full text-left px-3 py-2 rounded-md border transition-all ${
              selectedTypes.includes(type.id)
                ? getCategoryColor(type.category) + " font-medium"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {getCategoryIcon(type.category)} {type.name}
              </span>
              {type.latinName && (
                <span className="text-xs italic text-gray-500">
                  {type.latinName}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      {selectedTypes.length > 0 && (
        <p className="text-xs text-gray-600">
          Выбрано: {selectedTypes.length} вид(ов)
        </p>
      )}
    </div>
  );
}
