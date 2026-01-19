import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Coordinates } from "./routeContext";
export type LocationSource =
  | { type: "none" }
  | { type: "map" }
  | { type: "stop"; name: string; stopId: number };

type Trip = {
  start: Coordinates | null;
  end: Coordinates | null;
  startSource: LocationSource;
  endSource: LocationSource;
  setStart: (coords: Coordinates, source: LocationSource) => void;
  setEnd: (coords: Coordinates, source: LocationSource) => void;
  tripReady: boolean;
};
const TripContext = createContext<Trip | undefined>(undefined);

export const TripProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [start, setStartCoords] = useState<Coordinates | null>(null);
  const [end, setEndCoords] = useState<Coordinates | null>(null);
  const [startSource, setStartSource] = useState<LocationSource>({
    type: "none",
  });
  const [endSource, setEndSource] = useState<LocationSource>({ type: "none" });

  const setStart = (coords: Coordinates, source: LocationSource) => {
    setStartCoords(coords);
    setStartSource(source);
  };

  const setEnd = (coords: Coordinates, source: LocationSource) => {
    setEndCoords(coords);
    setEndSource(source);
  };

  const tripReady = start !== null && end !== null;

  return (
    <TripContext.Provider
      value={{
        start,
        end,
        startSource,
        endSource,
        setStart,
        setEnd,
        tripReady,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTrip = () => {
  const context = useContext(TripContext);
  if (!context) throw new Error("useTrip must be used inside TripProvider");
  return context;
};
