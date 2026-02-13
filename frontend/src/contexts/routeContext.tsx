import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTrip } from "./tripContext";
import { useTime } from "./timeContext";

export type WalkSegment = {
  type: "walk";
  from: string | number;
  to: string | number;
  fromName: string;
  toName: string;
  duration: number;
  distance: number;
};

export type Coordinates = { lat: number; lon: number };

export type TransitSegment = {
  type: "transit";
  from: number;
  to: number;
  fromName: string;
  toName: string;
  departure: number;
  direction: number;
  directionName: string;
  arrival: number;
  duration: number;
  line: string;
  routeId: number;
  signature: string;
  lineColor: string;
  lineType: string;
  formattedDeparture: string;
  formattedArrival: string;
  stopsBetween: {
    stopId: number;
    departureTime: number;
    departureTimeFormatted: string;
    name: string;
  }[];
  geometryPoints: { lat: number; lon: number }[];
};

export type Route = {
  id: number;
  departure: string;
  arrival: string;
  departureMinutes: number;
  arrivalMinutes: number;
  key: string;
  duration: string;
  transfers: number;
  weightedScore: number;
  segments: [WalkSegment, ...TransitSegment[], WalkSegment];
};

type RoutesContextType = {
  routes: Route[] | null;
  fetchRoutes: (append?: boolean) => Promise<void>;
  resetRoutes: () => void;
  isLoading: boolean;
  error: string | null;
};

// eslint-disable-next-line react-refresh/only-export-components
export const RoutesContext = createContext<RoutesContextType | null>(null);

export function RoutesProvider({ children }: { children: ReactNode }) {
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { start, end } = useTrip();
  const { startTime, endTime, timeWindow } = useTime();

  const prevStartTime = useRef(startTime);

  const fetchRoutes = useCallback(
    async () => {
      if (!start || !end) {
        console.warn("Cannot fetch routes: Start or End is missing");
        return;
      }

      setIsLoading(true);
      setError(null);

      const startTimeChanged = prevStartTime.current !== startTime;

      let finalStartTime = startTime;
      let finalEndTime = endTime;

      if (startTimeChanged) {
        finalEndTime = startTime + timeWindow;
        if (finalEndTime > 1440) finalEndTime = 1440;
      } else {
        finalStartTime = endTime - timeWindow;

        if (finalEndTime < 0) finalStartTime = 0;
      }

      try {
        const response = await fetch("http://localhost:2137/csa-route", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lat1: start.lon,
            lon1: start.lat,
            lat2: end.lon,
            lon2: end.lat,
            startTime: finalStartTime,
            endTime: finalEndTime,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch routes");
        }

        const data: Route[] = await response.json();

        if (!Array.isArray(data)) {
          setRoutes(null);
          return;
        }

        setRoutes((prevRoutes) => {
          if (!prevRoutes) return data;

          const existingKeys = new Set(prevRoutes.map((r) => r.key));

          const newRoutes = data.filter(
            (route) => !existingKeys.has(route.key),
          );

          return [...prevRoutes, ...newRoutes].sort(
            (a, b) => a.departureMinutes - b.departureMinutes,
          );
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setRoutes(null);
      } finally {
        setIsLoading(false);
      }
      prevStartTime.current = startTime;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [start, end, startTime, endTime],
  );

  const resetRoutes = useCallback(() => setRoutes(null), []);

  return (
    <RoutesContext.Provider
      value={{ routes, fetchRoutes, isLoading, error, resetRoutes }}
    >
      {children}
    </RoutesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRoutes() {
  const ctx = useContext(RoutesContext);
  if (!ctx) {
    throw new Error("useRoutes must be used inside RoutesProvider");
  }
  return ctx;
}
