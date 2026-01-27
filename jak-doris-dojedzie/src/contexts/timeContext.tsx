import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type TimeContextType = {
  initialTime: number;
  time: number;
  setTime: (time: number) => void;
  setInitialTime: (time: number) => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const TimeContext = createContext<TimeContextType | null>(null);

export function TimeProvider({
  children,
  initTime,
}: {
  children: ReactNode;
  initTime: number;
}) {
  const [time, setTime] = useState<number>(initTime);
  const [initialTime, setInitialTime] = useState<number>(initTime);
  return (
    <TimeContext.Provider
      value={{ time, setTime, initialTime, setInitialTime }}
    >
      {children}
    </TimeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTime() {
  const ctx = useContext(TimeContext);
  if (!ctx) {
    throw new Error("useTime must be used inside TimeProvider");
  }
  return ctx;
}
