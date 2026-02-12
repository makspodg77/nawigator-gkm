import { Fragment, type ReactElement } from "react";
import { useHoveredRoute } from "../../contexts/hoveredRouteContext";
import { useMenu } from "../../contexts/menuContext";
import type {
  Route,
  TransitSegment,
  WalkSegment,
} from "../../contexts/routeContext";
import useRoute from "../../hooks/useRoute";
import styles from "./routeOption.module.css";
import { FaWalking } from "react-icons/fa";
import { getSvgPath } from "../map/mapRoutePainter";

const RouteOption = ({ route }: { route: Route }) => {
  const { setHovered } = useHoveredRoute();
  const { setMenu } = useMenu();
  const { transitSegments, finalWalkSegment, initialWalkSegment } =
    useRoute(route);

  return (
    <button
      onMouseEnter={() => setHovered(route.key)}
      onFocus={() => setHovered(route.key)}
      onClick={() => setMenu("CHOSEN_ROUTE")}
      className={styles.button}
      aria-label={`Route departing at ${route.departure}, ${route.duration} minutes total`}
      type="button"
    >
      <RouteHeader
        route={route}
        initialWalkSegment={initialWalkSegment}
        finalWalkSegment={finalWalkSegment}
        transitSegments={transitSegments}
      />
    </button>
  );
};
type RouteHeaderProps = {
  route: Route;
  initialWalkSegment: WalkSegment | undefined;
  transitSegments: TransitSegment[];
  finalWalkSegment: WalkSegment | TransitSegment | undefined;
};

type VehicleLineProps = {
  transitLinesLength: number;
  line: {
    name: string;
    svgPath: ReactElement;
  };
};

export const VehicleLine = ({ transitLinesLength, line }: VehicleLineProps) => {
  return (
    <Fragment>
      {transitLinesLength <= 3 && line.svgPath}
      <div className={styles.line}>{line.name}</div>
    </Fragment>
  );
};

export const RouteHeader = ({
  route,
  initialWalkSegment,
  transitSegments,
  finalWalkSegment,
}: RouteHeaderProps) => {
  const transitLines = transitSegments.map((segment) => ({
    name: segment.line,
    svgPath: getSvgPath(segment.lineType).element,
  }));
  const firstTransit = transitSegments[0];
  const lastTransit = transitSegments[transitSegments.length - 1];
  const transitDuration = lastTransit?.arrival - firstTransit?.departure || 0;
  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <div>Odjazd</div>
        <div className={styles.departureTime}>{route.departure}</div>
      </div>
      <div className={styles.middle}>
        <div className={styles.lineContainer}>
          {transitLines.slice(0, 5).map((line, index) => (
            <VehicleLine
              transitLinesLength={transitLines.length}
              line={line}
              key={index}
            />
          ))}
        </div>
        <div className={styles.timeInfo}>
          {initialWalkSegment ? (
            <>
              <FaWalking style={{ flexShrink: 0 }} />
              {initialWalkSegment.duration} min
            </>
          ) : null}
          <div className={styles.milestoneTime} data-type={"origin"}>
            {firstTransit.formattedDeparture}
          </div>
          {`${transitDuration} min`}
          <div className={styles.milestoneTime} data-type={"destination"}>
            {lastTransit.formattedArrival}
          </div>
          {finalWalkSegment ? (
            <>
              <FaWalking style={{ flexShrink: 0 }} />
              {finalWalkSegment.duration} min
            </>
          ) : null}
        </div>
      </div>
      <div className={styles.right}>{`${route.duration} min`}</div>
    </div>
  );
};
export default RouteOption;
