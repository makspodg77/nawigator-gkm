import { useHoveredRoute } from "../../../../contexts/hoveredRouteContext";
import { useMenu } from "../../../../contexts/menuContext";
import { useRoutes } from "../../../../contexts/routeContext";
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
    </>
  );
};

export default RouteChosenMenuState;
