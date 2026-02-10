import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useMenu } from "./menuContext";

export type StopGroup = {
  id: number;
  name: string;
  municipality: number;
  lat: number;
  lon: number;
  lines: string[];
};

// eslint-disable-next-line react-refresh/only-export-components
export const StopsContext = createContext<StopGroup[] | null>(null);

export function StopsProvider({
  children,
  stops,
}: {
  children: ReactNode;
  stops: StopGroup[];
}) {
  const { setMenu } = useMenu();

  useEffect(() => {
    if (stops.length > 0) {
      setMenu("INITIAL");
    }
  }, [stops.length, setMenu]);

  return (
    <StopsContext.Provider value={stops}>{children}</StopsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStops() {
  const ctx = useContext(StopsContext);
  if (!ctx) {
    throw new Error("useStops must be used inside StopsProvider");
  }
  return ctx;
}
