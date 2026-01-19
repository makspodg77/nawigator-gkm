import { createContext, useContext, type ReactNode } from "react";

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
