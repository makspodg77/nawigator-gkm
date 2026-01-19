import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type TimeContextType = {
  time: number;
  setTime: (time: number) => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const timeContext = createContext<TimeContextType | null>(null);

export function TimeProvider({
  children,
  initialTime,
}: {
  children: ReactNode;
  initialTime: number;
}) {
  const [time, setTime] = useState<number>(initialTime);

  return (
    <timeContext.Provider value={{ time, setTime }}>
      {children}
    </timeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTime() {
  const ctx = useContext(timeContext);
  if (!ctx) {
    throw new Error("useTime must be used inside TimeProvider");
  }
  return ctx;
}
