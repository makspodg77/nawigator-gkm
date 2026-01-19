import { useTime } from "../../contexts/timeContext";

const Clock = () => {
  const { time, setTime } = useTime();

  const minutesToTimeString = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const timeStringToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };
  return (
    <input
      type="time"
      value={minutesToTimeString(time)}
      onChange={(e) => setTime(timeStringToMinutes(e.target.value))}
    />
  );
};

export default Clock;
