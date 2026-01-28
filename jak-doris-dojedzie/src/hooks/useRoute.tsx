import type {
  Route,
  TransitSegment,
  WalkSegment,
} from "../contexts/routeContext";
import { useTrip } from "../contexts/tripContext";

const useRoute = (route: Route | undefined) => {
  const { startSource, endSource } = useTrip();

  if (!route) {
    return {
      transitSegments: [],
      finalWalkSegment: undefined,
      initialWalkSegment: undefined,
    };
  }

  let segments: (WalkSegment | TransitSegment)[] = [...route.segments];

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

  return { transitSegments, finalWalkSegment, initialWalkSegment };
};

export default useRoute;
