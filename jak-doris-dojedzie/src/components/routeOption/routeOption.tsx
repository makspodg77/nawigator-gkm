import type { Route } from "../../contexts/routeContext";

const RouteOption = ({ route }: { route: Route }) => {
  const firstTransitSegment = route.segments[1];
  const lastTransitSegment = route.segments[route.segments.length - 2];
  return (
    <div>
      <h2>{route.departure}</h2>
      <h3>
        {route.segments.map((segment) =>
          segment.type === "transit" ? segment.line + " " : "",
        )}
        {"    "}
        {route.duration + " min "}
      </h3>
      <h4>
        {route.segments[0].duration > 1 ? route.segments[0].duration : ""} min{" "}
        {firstTransitSegment.type === "transit"
          ? firstTransitSegment.formattedDeparture
          : ""}{" "}
        {firstTransitSegment.type === "transit" &&
        lastTransitSegment.type === "transit"
          ? lastTransitSegment.arrival - firstTransitSegment.departure + " min "
          : "null"}
        {lastTransitSegment.type === "transit"
          ? lastTransitSegment.formattedArrival + " "
          : ""}
        {route.segments[route.segments.length - 1].duration > 1
          ? route.segments[route.segments.length - 1].duration + " min "
          : ""}
      </h4>
    </div>
  );
};

export default RouteOption;
