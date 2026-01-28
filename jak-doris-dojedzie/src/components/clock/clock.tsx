import { useTime } from "../../contexts/timeContext";

// eslint-disable-next-line react-refresh/only-export-components
export const minutesToTimeString = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

// eslint-disable-next-line react-refresh/only-export-components
export const timeStringToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const Clock = () => {
  const { initialStartTime, setInitialStartTime } = useTime();

  return (
    <input
      type="time"
      value={minutesToTimeString(initialStartTime)}
      onChange={(e) => setInitialStartTime(timeStringToMinutes(e.target.value))}
    />
  );
};

export default Clock;
