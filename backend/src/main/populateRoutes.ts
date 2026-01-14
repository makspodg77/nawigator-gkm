import { IPreFinalSegment } from "../models/models";
import {
  DepartureRoute,
  FullRoute,
  IRouteGeometry,
  Stop,
} from "../models/preprocessModels";
import { formatTime, getStopName } from "./csa";

export async function populateRoutes(
  segment: IPreFinalSegment,
  stopInfo: Map<number, Stop>,
  depRoutes: DepartureRoute[],
  fullRoutesByRoute: Map<number, FullRoute[]>,
  additionalByDep: Map<number, Set<number>>,
  routeGeometryByDep: Map<number, IRouteGeometry[]>
) {
  const routeId = depRoutes.find((dr) => dr.id == segment.routeId)?.routeId;
  if (!routeId) return segment;

  const additionalStops = additionalByDep.get(segment.routeId);

  const fullRoute = fullRoutesByRoute
    .get(routeId)
    ?.filter((fr) => !fr.isOptional || additionalStops?.has(fr.stopNumber));

  if (!fullRoute) return segment;

  const from = fullRoute.findIndex((fr) => fr.stopId === segment.from);
  const to = fullRoute.findIndex((fr) => fr.stopId === segment.to);

  if (from === -1 || to === -1 || from >= to) {
    return segment;
  }

  const fromStopNumber = fullRoute[from].stopNumber;
  const toStopNumber = fullRoute[to].stopNumber;

  const allGeometry = routeGeometryByDep.get(segment.routeId) || [];
  const sortedGeometry = allGeometry.sort((a, b) => a.id - b.id);

  const fromGeomIndex = sortedGeometry.findIndex(
    (g) => g.stopNumber === fromStopNumber
  );
  const toGeomIndex = sortedGeometry.findIndex(
    (g) => g.stopNumber === toStopNumber
  );

  const routeGeometry =
    fromGeomIndex !== -1 && toGeomIndex !== -1
      ? sortedGeometry.slice(fromGeomIndex, toGeomIndex + 1)
      : [];

  let departureTime = segment.departure;
  const stopsBetween = fullRoute.slice(from + 1, to).map((stop) => {
    departureTime += stop.travelTime;
    return {
      stopId: stop.stopId,
      departureTime: departureTime,
      departureTimeFormatted: formatTime(departureTime),
      name: getStopName(stop.stopId, stopInfo),
    };
  });

  return {
    ...segment,
    formattedDeparture: formatTime(segment.departure),
    formattedArrival: formatTime(segment.arrival),
    stopsBetween: stopsBetween,
    coords: routeGeometry
      .sort((a, b) => a.id - b.id)
      .map((g) => ({
        lat: g.lat,
        lon: g.lon,
      })),
  };
}
