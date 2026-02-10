import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type TimeContextType = {
  initialStartTime: number;
  startTime: number;
  endTime: number;
  setInitialStartTime: (time: number) => void;
  getNewLowerBound: () => void;
  getNewUpperBound: () => void;
  resetTime: () => void;
  timeWindow: number;
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
  const timeWindow = 120;

  const [initialStartTime, setInitialStartTimeState] =
    useState<number>(initTime);
  const [startTime, setStartTime] = useState<number>(initTime);
  const [endTime, setEndTime] = useState<number>(() => {
    const end = initTime + timeWindow;
    return end > 1440 ? 1440 : end;
  });

  const setInitialStartTime = (time: number) => {
    setInitialStartTimeState(time);
    setStartTime(time);
    let newEndTime = time + timeWindow;
    if (newEndTime > 1440) newEndTime = 1440;
    setEndTime(newEndTime);
  };

  const resetTime = () => {
    setStartTime(initialStartTime);
    let newEndTime = initialStartTime + timeWindow;
    if (newEndTime > 1440) newEndTime = 1440;
    setEndTime(newEndTime);
  };

  const getNewLowerBound = () => {
    let newTime = startTime - timeWindow;
    if (newTime < 0) newTime = 0;
    setStartTime(newTime);
  };

  const getNewUpperBound = () => {
    let newTime = endTime + timeWindow;
    if (newTime > 1440) newTime = 1440;
    setEndTime(newTime);
  };

  return (
    <TimeContext.Provider
      value={{
        getNewUpperBound,
        getNewLowerBound,
        startTime,
        timeWindow,
        endTime,
        initialStartTime,
        setInitialStartTime,
        resetTime,
      }}
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
