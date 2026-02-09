import { VscArrowLeft, VscArrowRight } from "react-icons/vsc";
import { useHoveredRoute } from "../../../../contexts/hoveredRouteContext";
import { useMenu } from "../../../../contexts/menuContext";
import {
  useRoutes,
  type TransitSegment,
  type WalkSegment,
} from "../../../../contexts/routeContext";
import useRoute from "../../../../hooks/useRoute";
import menuStyles from "../../menu.module.css";
import styles from "./routeChosen.module.css";
import { RouteHeader, VehicleLine } from "../../../routeOption/routeOption";
import { useState } from "react";
import { FaWalking } from "react-icons/fa";
import { getSvgPath } from "../../../map/mapRoutePainter";
import { LuChevronsUpDown } from "react-icons/lu";
import clsx from "clsx";

const RouteChosenMenuState = () => {
  const { setMenu } = useMenu();
  const { hovered } = useHoveredRoute();
  const { routes } = useRoutes();
  const route = routes?.find((r) => r.key === hovered);

  const { transitSegments, finalWalkSegment, initialWalkSegment } =
    useRoute(route);

  if (!route) {
    setMenu("ERROR");
    return null;
  }

  return (
    <>
      <div className={menuStyles.topPanel}>
        <div className={menuStyles.header}>
          <button onClick={() => setMenu("INITIAL")}>
            <VscArrowLeft />
          </button>
        </div>
      </div>
      <div className={styles.header}>
        <RouteHeader
          transitSegments={transitSegments}
          finalWalkSegment={finalWalkSegment}
          initialWalkSegment={initialWalkSegment}
          route={route}
        />
      </div>
      <div className={styles.container}>
        {route.segments.map((segment) => {
          if (segment.type === "transit")
            return <TransitSegmentComponent segment={segment} />;

          if (segment.type === "walk" && segment.duration > 2)
            return <WalkSegmentComponent segment={segment} />;
          return null;
        })}
      </div>
    </>
  );
};

const WalkSegmentComponent = ({ segment }: { segment: WalkSegment }) => {
  return (
    <div className={styles.segment}>
      <div className={styles.leftCellWalk}>
        <FaWalking size={20} />
      </div>
      <div className={styles.rightCellWalk}>
        <div>{segment.duration} min</div> <div>{segment.distance} m</div>
      </div>
    </div>
  );
};
const TransitSegmentComponent = ({ segment }: { segment: TransitSegment }) => {
  const [showStops, setShowStops] = useState(false);
  const line = getSvgPath(segment.lineType);
  return (
    <div className={styles.transitSegment}>
      <div className={styles.leftCell}>{segment.formattedDeparture}</div>
      <div className={clsx(styles.rightCell, styles.milestoneText)}>
        {segment.fromName}
      </div>
      <div className={styles.leftCell}>
        <div className={styles.lineIconContainer}>
          <VehicleLine
            line={{ name: segment.line, svgPath: line.element }}
            transitLinesLength={1}
            index={1}
          />
        </div>
      </div>
      <div className={clsx(styles.rightCellWalk, styles.milestoneText)}>
        <div>
          <VscArrowRight /> {segment.directionName}
        </div>
        <div>{segment.duration} m</div>
      </div>
      <div className={styles.leftCell}>
        <div className={styles.connector}></div>
      </div>
      <div
        className={styles.rightCell}
        onClick={() => setShowStops((prev) => !prev)}
      >
        <div className={styles.rightCellWalk}>
          <div>{segment.stopsBetween.length + 1} stops</div>
          <div>
            <LuChevronsUpDown />
          </div>
        </div>
      </div>
      {showStops &&
        segment.stopsBetween.map((sb, index) => (
          <>
            <div key={`time-${index}`} className={styles.leftCell}>
              <div className={styles.bStopTime}>
                {sb.departureTimeFormatted}
              </div>
              <div className={styles.connector}></div>
            </div>
            <div key={`name-${index}`} className={styles.rightCell}>
              {index + 1}. {sb.name}
            </div>
          </>
        ))}
      <div className={styles.leftCell}>
        <div className={styles.connector}></div>
      </div>
      <div className={styles.rightCellWalk}></div>
      <div className={styles.leftCell}>{segment.formattedArrival}</div>
      <div className={clsx(styles.rightCell, styles.milestoneText)}>
        {segment.toName}
      </div>
    </div>
  );
};

export default RouteChosenMenuState;
