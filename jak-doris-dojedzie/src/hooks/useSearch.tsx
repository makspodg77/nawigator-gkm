import { useMemo } from "react";
import { useStops } from "../contexts/stopContext";

const normalize = (str: string) =>
  str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export const useSearch = (value: string) => {
  const stops = useStops();

  const filteredStops = useMemo(() => {
    const q = normalize(value.trim());
    if (!q) return stops;

    return stops.filter((stop) => normalize(stop.name).includes(q));
  }, [stops, value]);

  return filteredStops;
};
