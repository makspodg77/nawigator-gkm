import { useHoveredRoute } from "../../contexts/hoveredRouteContext";
import type {
  Route,
  TransitSegment,
  WalkSegment,
} from "../../contexts/routeContext";
import { useTrip } from "../../contexts/tripContext";

const RouteOption = ({ route }: { route: Route }) => {
  const { setHovered } = useHoveredRoute();
  let segments: (WalkSegment | TransitSegment)[] = [...route.segments];

  const { startSource, endSource } = useTrip();

  const initialWalkSegment =
    segments[0].type === "walk" && segments[0].duration > 1
      ? segments[0]
      : undefined;

  const finalWalkSegment =
    segments[segments.length - 1].type === "walk" &&
    segments[segments.length - 1].duration > 1
      ? segments[segments.length - 1]
      : undefined;

  if (startSource.type === "stop" && segments[0]?.type === "walk") {
    segments = segments.slice(1);
  }

  if (
    endSource.type === "stop" &&
    segments[segments.length - 1]?.type === "walk"
  ) {
    segments = segments.slice(0, -1);
  }

  const transitSegments = segments.filter(
    (s): s is TransitSegment => s.type === "transit",
  );

  return (
    <div onMouseEnter={() => setHovered(route.key)}>
      <h2>{route.departure}</h2>
      <h3>
        {route.segments.map((segment) =>
          segment.type === "transit" ? segment.line + " " : "",
        )}
        {"    "}
        {route.duration + " min "}
      </h3>
      <h4>
        {initialWalkSegment ? initialWalkSegment.duration + "min " : ""}
        {transitSegments[0].formattedDeparture}{" "}
        {transitSegments[transitSegments.length - 1].arrival -
          transitSegments[0].departure +
          " min "}
        {transitSegments[transitSegments.length - 1].formattedArrival + " "}
        {finalWalkSegment ? finalWalkSegment.duration + "min " : ""}
      </h4>
    </div>
  );
};

export default RouteOption;
