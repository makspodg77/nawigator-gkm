import { useSearch } from "../../hooks/useSearch";
import type { Coordinates } from "../../contexts/routeContext";
import type { LocationSource } from "../../contexts/tripContext";
import styles from "./stopList.module.css";
import { GiBusStop } from "react-icons/gi";

interface StopListProps {
  value: string;
  onClick: (coords: Coordinates, source: LocationSource) => void;
}

const StopList = ({ value, onClick }: StopListProps) => {
  const stops = useSearch(value);

  const formatLines = (lines: string[]) =>
    lines.length > 4 ? lines.slice(0, 4).join(", ") + "…" : lines.join(", ");

  return (
    <div className={styles.container} onMouseDown={(e) => e.preventDefault()}>
      {stops.map((s) => (
        <div
          className={styles.stop}
          key={s.id}
          onClick={() =>
            onClick(
              { lat: s.lon, lon: s.lat },
              { type: "stop", name: s.name, stopId: s.id },
            )
          }
        >
          <div className={styles.iconContainer}>
            <GiBusStop className={styles.icon} />
          </div>
          <div>
            <div className={styles.name}>{s.name}</div>
            <div className={styles.info}>
              przystanek, linie: {formatLines(s.lines)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StopList;
