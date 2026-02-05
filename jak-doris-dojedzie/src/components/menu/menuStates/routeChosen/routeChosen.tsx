import { useHoveredRoute } from "../../../../contexts/hoveredRouteContext";
import { useMenu } from "../../../../contexts/menuContext";
import {
  useRoutes,
  type TransitSegment,
  type WalkSegment,
} from "../../../../contexts/routeContext";
import useRoute from "../../../../hooks/useRoute";

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
      <button onClick={() => setMenu("FOUND_ROUTES")}>back</button>
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
      {route.segments.map((segment) => {
        if (segment.type === "transit")
          return <TransitSegmentComponent segment={segment} />;

        if (segment.type === "walk" && segment.duration > 2)
          return <WalkSegmentComponent segment={segment} />;
        return null;
      })}
    </>
  );
};

const WalkSegmentComponent = ({ segment }: { segment: WalkSegment }) => {
  return (
    <div>
      {segment.duration} min {segment.distance} m
    </div>
  );
};

const TransitSegmentComponent = ({ segment }: { segment: TransitSegment }) => {
  return (
    <>
      <div>
        {segment.formattedDeparture}
        {"  "} {segment.fromName}
      </div>
      <div>
        {segment.line} {"->"} {segment.directionName} {segment.duration} m
      </div>
      <div>{segment.stopsBetween.length + 1} stops</div>
      <div>
        {segment.stopsBetween.map((sb) => (
          <div>
            {sb.name} {sb.departureTimeFormatted}
          </div>
        ))}
      </div>
      <div>
        {segment.formattedArrival} {segment.toName}
      </div>
    </>
  );
};

export default RouteChosenMenuState;
