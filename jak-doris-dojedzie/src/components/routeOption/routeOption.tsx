import { useHoveredRoute } from "../../contexts/hoveredRouteContext";
import { useMenu } from "../../contexts/menuContext";
import type { Route } from "../../contexts/routeContext";
import useRoute from "../../hooks/useRoute";
import styles from "./routeOption.module.css";

const RouteOption = ({ route }: { route: Route }) => {
  const { setHovered } = useHoveredRoute();
  const { setMenu } = useMenu();
  const { transitSegments, finalWalkSegment, initialWalkSegment } =
    useRoute(route);

  const transitLines = transitSegments.map((segment) => segment.line);
  const firstTransit = transitSegments[0];
  const lastTransit = transitSegments[transitSegments.length - 1];
  const transitDuration = lastTransit?.arrival - firstTransit?.departure || 0;

  return (
    <button
      onMouseEnter={() => setHovered(route.key)}
      onFocus={() => setHovered(route.key)}
      onClick={() => setMenu("CHOSEN_ROUTE")}
      className={styles.container}
      aria-label={`Route departing at ${route.departure}, ${route.duration} minutes total`}
      type="button"
    >
      <div className={styles.left}>
        <div>Odjazd</div>
        <div className={styles.departureTime}>{route.departure}</div>
      </div>
      <div className={styles.middle}>
        <div className={styles.lineContainer}>
          {transitLines.map((line, index) => (
            <div key={index} className={styles.line}>
              {line}
            </div>
          ))}
        </div>
        <div className={styles.timeInfo}>
          {initialWalkSegment ? `${initialWalkSegment.duration} min` : null}
          <div
            className={styles.milestoneTime}
            style={{ backgroundColor: "#0a9f6b" }}
          >
            {firstTransit.formattedDeparture}
          </div>
          {`${transitDuration} min`}
          <div
            className={styles.milestoneTime}
            style={{ backgroundColor: "#00acf1" }}
          >
            {lastTransit.formattedArrival}
          </div>
          {finalWalkSegment ? `${finalWalkSegment.duration} min` : null}
        </div>
      </div>
      <div className={styles.right}>{`${route.duration} min`}</div>
    </button>
  );
};

export default RouteOption;
