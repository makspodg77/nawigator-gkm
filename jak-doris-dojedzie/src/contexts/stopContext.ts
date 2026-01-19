import { createContext, useContext } from "react";

export type StopGroup = {
  id: number;
  name: string;
  municipality: number;
  lines: string[];
};

export const StopsContext = createContext<StopGroup[] | null>(null);

export function useStops() {
  const ctx = useContext(StopsContext);
  if (!ctx) {
    throw new Error("useStops must be used inside StopsContext.Provider");
  }
  return ctx;
}
