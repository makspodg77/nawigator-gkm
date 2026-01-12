import { IPreFinalSegment } from "../models/models";
import { DepartureRoute, FullRoute, Stop } from "../models/preprocessModels";
import { executeQuery } from "../utils/sqlHelper";
import { formatTime, getStopName } from "./csa";

export async function populateRoutes(
  segment: IPreFinalSegment,
  stopInfo: Map<number, Stop>,
  depRoutes: DepartureRoute[],
  fullRoutesByRoute: Map<number, FullRoute[]>,
  additionalByDep: Map<number, Set<number>>
) {
  const routeId = depRoutes.find((dr) => dr.id == segment.routeId)?.routeId;
  if (!routeId) return;

  const additionalStops = additionalByDep.get(segment.routeId);
  const fullRoute = fullRoutesByRoute
    .get(routeId)
    ?.filter((fr) => !fr.isOptional || additionalStops?.has(fr.stopNumber));
  const from = fullRoute?.findIndex((fr) => fr.stopId === segment.from);
  const to = fullRoute?.findIndex((fr) => fr.stopId === segment.to);
  if (fullRoute && from && to) {
    const fromStopNumber = fullRoute[from].stopNumber;
    const toStopNumber = fullRoute[to].stopNumber;
    const routeGeometry = await executeQuery(
      `SELECT * FROM map_route 
     WHERE departure_route_id = $1 
       AND id >= (
         SELECT id FROM map_route 
         WHERE departure_route_id = $1 AND stop_number = $2 
         LIMIT 1
       )
       AND id <= (
         SELECT id FROM map_route 
         WHERE departure_route_id = $1 AND stop_number = $3 
         LIMIT 1
       )
     ORDER BY id`,
      [segment.routeId, fromStopNumber, toStopNumber]
    );
    if (routeGeometry.length === 0) {
      console.log(routeId, fromStopNumber, toStopNumber);
    }
    let departureTime = segment.departure;
    if (typeof from === "number" && from !== -1 && to !== -1) {
      const stopsBetween = fullRoute?.slice(from + 1, to).map((stop) => {
        departureTime += stop.travelTime;
        return {
          departureTime: formatTime(departureTime),
          name: getStopName(stop.stopId, stopInfo),
        };
      });

      return {
        ...segment,
        formattedDeparture: formatTime(segment.departure),
        formattedArrival: formatTime(segment.arrival),
        stopsBetween: stopsBetween,
        coords: routeGeometry,
      };
    }
  }
}
