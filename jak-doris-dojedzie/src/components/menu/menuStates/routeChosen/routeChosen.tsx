import { VscArrowLeft, VscArrowRight } from "react-icons/vsc";
import { useHoveredRoute } from "../../../../contexts/hoveredRouteContext";
import { useMenu } from "../../../../contexts/menuContext";
import {
  useRoutes,
  type Route,
  type TransitSegment,
  type WalkSegment,
} from "../../../../contexts/routeContext";
import useRoute from "../../../../hooks/useRoute";
import menuStyles from "../../menu.module.css";
import styles from "./routeChosen.module.css";
import { RouteHeader, VehicleLine } from "../../../routeOption/routeOption";
import { Fragment, useState } from "react";
import { FaWalking } from "react-icons/fa";
import { getSvgPath } from "../../../map/mapRoutePainter";
import { LuChevronsUpDown } from "react-icons/lu";
import clsx from "clsx";
import { minutesToTimeString } from "../../../clock/clock";
import { useTrip } from "../../../../contexts/tripContext";
import { getDisplayValue } from "../initial/initial";

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
  minutesToTimeString(23);
  return (
    <>
      <div className={menuStyles.topPanel}>
        <div className={menuStyles.header}>
          <button onClick={() => setMenu("FOUND_ROUTES")}>
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
            return <WalkSegmentComponent segment={segment} route={route} />;
          return null;
        })}
      </div>
    </>
  );
};

const WalkSegmentComponent = ({
  segment,
  route,
}: {
  segment: WalkSegment;
  route: Route;
}) => {
  const { startSource, endSource } = useTrip();
  let isFirst = false;
  if (segment.from === "origin") isFirst = true;

  return (
    <>
      <div className={styles.segment}>
        {isFirst ? (
          <Milestone
            name={getDisplayValue(startSource)}
            time={route.departure}
          />
        ) : null}

        <div className={styles.leftCellWalk}>
          <FaWalking size={20} />
        </div>
        <div className={styles.rightCellWalk}>
          <div>{segment.duration} min</div> <div>{segment.distance} m</div>
        </div>

        {!isFirst ? (
          <Milestone name={getDisplayValue(endSource)} time={route.arrival} />
        ) : null}
      </div>
    </>
  );
};

const TransitSegmentComponent = ({ segment }: { segment: TransitSegment }) => {
  const [showStops, setShowStops] = useState(false);
  const line = getSvgPath(segment.lineType);
  const totalStops = segment.stopsBetween.length + 1;

  return (
    <div
      className={styles.transitSegment}
      style={{ "--line-color": segment.lineColor } as React.CSSProperties}
    >
      <Milestone name={segment.fromName} time={segment.formattedDeparture} />
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
        <div
          className={styles.connector}
          style={{ backgroundColor: segment.lineColor }}
        />
      </div>
      <button
        className={clsx(styles.rightCell, styles.button)}
        onClick={() => setShowStops((prev) => !prev)}
        aria-expanded={showStops}
        aria-label={`${showStops ? "Hide" : "Show"} intermediate stops`}
        type="button"
      >
        <div className={styles.rightCellWalk}>
          <div>
            {totalStops}{" "}
            {totalStops > 4
              ? "przystanków"
              : totalStops > 1
                ? "przystanki"
                : "przystanek"}
          </div>
          <LuChevronsUpDown aria-hidden="true" />
        </div>
      </button>

      {showStops &&
        segment.stopsBetween.map((stop, index) => (
          <StopBetween
            stop={stop}
            segment={segment}
            index={index}
            key={stop.stopId || `stop-${index}`}
          />
        ))}
      <FinalConnector lineColor={segment.lineColor} />
      <Milestone name={segment.toName} time={segment.formattedArrival} />
    </div>
  );
};

const Milestone = ({ name, time }: { name: string; time: string }) => {
  return (
    <>
      <div className={styles.leftCell}>
        <span className={styles.milestoneTime}>{time}</span>
      </div>
      <div className={clsx(styles.rightCell, styles.milestoneText)}>{name}</div>
    </>
  );
};

const StopBetween = ({
  stop,
  segment,
  index,
}: {
  stop: {
    stopId: number;
    departureTime: number;
    departureTimeFormatted: string;
    name: string;
  };
  segment: TransitSegment;
  index: number;
}) => {
  return (
    <Fragment key={stop.stopId || `stop-${index}`}>
      <div className={styles.leftCell}>
        <div className={clsx(styles.bStopTime, styles.betweenStops)}>
          {stop.departureTimeFormatted}
        </div>
        <div
          className={styles.connector}
          style={{ backgroundColor: segment.lineColor }}
        />
      </div>
      <div className={clsx(styles.rightCell, styles.betweenStops)}>
        <span className={styles.stopNumber}>{index + 1}.</span> {stop.name}
      </div>
    </Fragment>
  );
};

const FinalConnector = ({ lineColor }: { lineColor: string }) => (
  <>
    <div className={styles.leftCell}>
      <div
        className={styles.finalConnector}
        style={{ backgroundColor: lineColor }}
      />
      <div className={styles.dot} style={{ backgroundColor: lineColor }}>
        <div className={styles.innerDot} />
      </div>
    </div>

    <div className={styles.rightCellWalk} />
  </>
);

export default RouteChosenMenuState;
