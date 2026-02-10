import { useSearch } from "../../hooks/useSearch";
import type { Coordinates } from "../../contexts/routeContext";
import type { LocationSource } from "../../contexts/tripContext";
import styles from "./stopList.module.css";
import { GiBusStop } from "react-icons/gi";

const StopList = ({
  value,
  onClick,
}: {
  value: string;
  onClick: (coords: Coordinates, source: LocationSource) => void;
}) => {
  const stops = useSearch(value);

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
          <div className={styles.icon}>
            <GiBusStop />
          </div>
          <div>
            <div className={styles.name}>{s.name}</div>
            <div className={styles.info}>
              przystanek, linie:{" "}
              {s.lines.length > 4
                ? s.lines.slice(0, 4).join(", ") + "..."
                : s.lines.join(", ")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StopList;
