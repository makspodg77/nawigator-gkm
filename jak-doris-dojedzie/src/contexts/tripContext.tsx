import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Coordinates } from "./routeContext";

type Trip = {
  start: Coordinates | null;
  end: Coordinates | null;
  setStart: (coords: Coordinates) => void;
  setEnd: (coords: Coordinates) => void;
  tripReady: boolean;
};

const TripContext = createContext<Trip | undefined>(undefined);

export const TripProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [start, setStart] = useState<Coordinates | null>(null);
  const [end, setEnd] = useState<Coordinates | null>(null);

  const tripReady = start !== null && end !== null;

  return (
    <TripContext.Provider value={{ start, end, setStart, setEnd, tripReady }}>
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
