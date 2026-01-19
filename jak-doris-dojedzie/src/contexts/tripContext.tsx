import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type Trip = {
  start?: [number, number];
  end?: [number, number];
  setStart: (coords: [number, number]) => void;
  setEnd: (coords: [number, number]) => void;
};

const TripContext = createContext<Trip | undefined>(undefined);

export const TripProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [start, setStartState] = useState<[number, number]>();
  const [end, setEndState] = useState<[number, number]>();

  const setStart = (coords: [number, number]) => setStartState(coords);
  const setEnd = (coords: [number, number]) => setEndState(coords);

  return (
    <TripContext.Provider value={{ start, end, setStart, setEnd }}>
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
