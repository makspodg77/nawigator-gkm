import { useSearch } from "../../hooks/useSearch";
import type { Coordinates } from "../../contexts/routeContext";
import type { LocationSource } from "../../contexts/tripContext";
import styles from "./stopList.module.css";
import { GiBusStop } from "react-icons/gi";
import { useCallback } from "react";
import type { StopGroup } from "../../contexts/stopContext";

interface StopListProps {
  value: string;
  onClick: (coords: Coordinates, source: LocationSource) => void;
}

const StopList = ({ value, onClick }: StopListProps) => {
  const stops = useSearch(value);

  const formatLines = (lines: string[]) =>
    lines.length > 4 ? lines.slice(0, 4).join(", ") + "…" : lines.join(", ");

  const handleStopClick = useCallback(
    (stop: StopGroup) => {
      onClick(
        { lon: stop.lat, lat: stop.lon },
        { type: "stop", name: stop.name, stopId: stop.id },
      );
    },
    [onClick],
  );

  return (
    <ul
      className={styles.container}
      onMouseDown={(e) => e.preventDefault()}
      role="listbox"
      aria-label="Lista przystanków"
    >
      {stops.map((stop) => (
        <li key={stop.id} role="option">
          <button
            className={styles.stop}
            onClick={() => handleStopClick(stop)}
            aria-label={`${stop.name}, linie: ${formatLines(stop.lines)}`}
          >
            <div className={styles.iconContainer} aria-hidden="true">
              <GiBusStop className={styles.icon} />
            </div>
            <div>
              <div className={styles.name}>{stop.name}</div>
              <div className={styles.info}>
                przystanek, linie: {formatLines(stop.lines)}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
};

export default StopList;
