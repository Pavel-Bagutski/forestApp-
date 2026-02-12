import { useState, useEffect } from "react";

interface GeocodeResult {
  address: string;
  isLoading: boolean;
  error: string | null;
}

export function useReverseGeocode(lat: number, lng: number): GeocodeResult {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;

    setIsLoading(true);
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.display_name) {
          const parts = data.display_name.split(",").map((s: string) => s.trim());
          const region = parts.find((p: string) => p.includes("область"));
          const district = parts.find((p: string) => p.includes("район"));
          const city = parts.find((p: string) => 
            p.includes("город") || p.includes("посёлок") || p.includes("агрогородок")
          );
          setAddress([region, district, city].filter(Boolean).slice(0, 3).join(", ") || parts.slice(0, 2).join(", "));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [lat, lng]);

  return { address, isLoading, error };
}