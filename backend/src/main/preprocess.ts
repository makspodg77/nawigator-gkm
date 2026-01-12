import { getPreciseDistance } from "geolib";
import { executeQuery } from "../utils/sqlHelper";
import { initializeRouter } from "./csa";
import RBush from "rbush";
import {
  Stop,
  Line,
  LineType,
  Route,
  DepartureRoute,
  FullRoute,
  Timetable,
  AdditionalStop,
  TreeItem,
  Connections,
  RideConnection,
  IRouteGeometry,
} from "../models/preprocessModels";

const CONFIG = {
  WALK_LIMIT_METERS: 3000,
  WALK_SPEED_METERS_PER_MIN: 80,
  TRANSFER_MINUTES: 2,
  SPATIAL_RADIUS_KM: 2,
};

class SpatialIndex {
  private tree = new RBush<TreeItem>();

  add = (s: Stop) =>
    this.tree.insert({
      minX: s.lon,
      minY: s.lat,
      maxX: s.lon,
      maxY: s.lat,
      stopId: s.id,
      lat: s.lat,
      lon: s.lon,
    });

  getNearby = (lat: number, lon: number) => {
    const latDegreeDist = 111;
    const lonDegreeDist = 111 * Math.cos(lat * (Math.PI / 180));

    const rLat = CONFIG.SPATIAL_RADIUS_KM / latDegreeDist;
    const rLon = CONFIG.SPATIAL_RADIUS_KM / lonDegreeDist;

    return this.tree.search({
      minX: lon - rLon,
      minY: lat - rLat,
      maxX: lon + rLon,
      maxY: lat + rLat,
    });
  };
}

export const preprocess = async () => {
  const [
    rawStops,
    rawLines,
    rawLineTypes,
    rawRoutes,
    rawDepRoutes,
    rawFullRoutes,
    rawTimetables,
    rawAdditionalStops,
    rawRouteGeometry,
  ] = await Promise.all([
    executeQuery<any>(
      `SELECT s.id, s.alias, sg.name as "groupName", s.stop_group_id as "groupId", split_part(s.map, ',', 1) as lat, split_part(s.map, ',', 2) as lon FROM stop s JOIN stop_group sg ON sg.id = s.stop_group_id`
    ),
    executeQuery<any>(
      'SELECT id, name, line_type_id as "lineTypeId" FROM line'
    ),
    executeQuery<any>(
      'SELECT id, name_singular as "nameSingular", color FROM line_type'
    ),
    executeQuery<any>(
      'SELECT id, line_id as "lineId", is_night as "isNight" FROM route'
    ),
    executeQuery<any>(
      'SELECT id, signature, color, route_id as "routeId" FROM departure_route'
    ),
    executeQuery<any>(
      'SELECT id, stop_id as "stopId", travel_time as "travelTime", stop_number as "stopNumber", route_id as "routeId", is_optional as "isOptional" FROM full_route ORDER BY route_id, stop_number'
    ),
    executeQuery<any>(
      'SELECT route_id as "routeId", departure_time as "departureTime" FROM timetable ORDER BY route_id, departure_time'
    ),
    executeQuery<any>(
      'SELECT route_id as "routeId", stop_number as "stopNumber" FROM additional_stop'
    ),
    executeQuery<any>(
      "SELECT id, lat, lon, departure_route_id, stop_number from map_route"
    ),
  ]);

  const stops: Stop[] = rawStops.map((s) => ({
    ...s,
    id: Number(s.id),
    groupId: Number(s.groupId),
    lat: Number(s.lat),
    lon: Number(s.lon),
  }));
  const lines: Line[] = rawLines.map((l) => ({
    ...l,
    id: Number(l.id),
    lineTypeId: Number(l.lineTypeId),
  }));
  const lineTypes: LineType[] = rawLineTypes.map((lt) => ({
    ...lt,
    id: Number(lt.id),
  }));
  const routes: Route[] = rawRoutes.map((r) => ({
    ...r,
    id: Number(r.id),
    lineId: Number(r.lineId),
    isNight: Boolean(r.isNight),
  }));
  const depRoutes: DepartureRoute[] = rawDepRoutes.map((dr) => ({
    ...dr,
    id: Number(dr.id),
    routeId: Number(dr.routeId),
  }));
  const routeGeometry: IRouteGeometry[] = rawRouteGeometry.map((mg) => ({
    id: mg.id,
    lat: Number(mg.lat),
    lon: Number(mg.lon),
    departureRouteId: mg.departureRouteId,
    stopNumber: mg.stopNumber,
  }));

  const fullRoutes: FullRoute[] = rawFullRoutes.map((fr) => ({
    ...fr,
    id: Number(fr.id),
    stopId: Number(fr.stopId),
    travelTime: Number(fr.travelTime),
    stopNumber: Number(fr.stopNumber),
    routeId: Number(fr.routeId),
    isOptional: Boolean(fr.isOptional),
  }));

  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const timetables: Timetable[] = rawTimetables.map((t) => ({
    ...t,
    routeId: Number(t.routeId),
    departureTime: parseTime(t.departureTime),
  }));
  const additionalStops: AdditionalStop[] = rawAdditionalStops.map((as) => ({
    ...as,
    routeId: Number(as.routeId),
    stopNumber: Number(as.stopNumber),
  }));

  const lineMap = new Map(lines.map((l) => [l.id, l]));
  const lineTypeMap = new Map(lineTypes.map((lt) => [lt.id, lt]));
  const routeMap = new Map(routes.map((r) => [r.id, r]));

  const timetableByDep = timetables.reduce((acc, t) => {
    let times = acc.get(t.routeId);

    if (!times) {
      times = [];
      acc.set(t.routeId, times);
    }

    times.push(t.departureTime);
    return acc;
  }, new Map<number, number[]>());

  const additionalByDep = additionalStops.reduce((acc, a) => {
    if (!acc.has(a.routeId)) acc.set(a.routeId, new Set());
    acc.get(a.routeId)?.add(a.stopNumber);
    return acc;
  }, new Map<number, Set<number>>());

  const routeGeometryByDep = routeGeometry.reduce((acc, mg) => {
    acc.set(mg.departureRouteId, [...(acc.get(mg.departureRouteId) || []), mg]);
    return acc;
  }, new Map<number, IRouteGeometry[]>());
  const fullRoutesByRoute = fullRoutes.reduce((acc, fr) => {
    acc.set(fr.routeId, [...(acc.get(fr.routeId) || []), fr]);
    return acc;
  }, new Map<number, FullRoute[]>());

  const connections: Map<number, Connections> = new Map();
  const stopInfo = new Map(stops.map((s) => [s.id, s]));
  const stopsByGroup = new Map<number, number[]>();

  for (const s of stops) {
    connections.set(s.id, { rides: [], transfers: [] });
    stopsByGroup.set(s.groupId, [...(stopsByGroup.get(s.groupId) || []), s.id]);
  }

  for (const depRoute of depRoutes) {
    const route = routeMap.get(depRoute.routeId);
    const line = lineMap.get(route?.lineId ?? -1);
    if (!route || !line) continue;

    const baseTimes = timetableByDep.get(depRoute.id) || [];

    const activeStops = (fullRoutesByRoute.get(depRoute.routeId) || []).filter(
      (fr) =>
        !fr.isOptional || additionalByDep.get(depRoute.id)?.has(fr.stopNumber)
    );
    let currentOffset = 0;
    const timeline = activeStops.map((stop, index) => {
      if (index > 0) {
        currentOffset += stop.travelTime;
      }
      return { stop, offset: currentOffset };
    });

    for (let i = 0; i < timeline.length - 1; i++) {
      const { stop: from, offset: startOffset } = timeline[i];
      const { stop: to, offset: endOffset } = timeline[i + 1];
      const distTime = endOffset - startOffset;
      if (distTime < 0) continue;

      const ridesAtStop = connections.get(from.stopId)?.rides;
      if (ridesAtStop) {
        ridesAtStop.push({
          from: from.stopId,
          to: to.stopId,
          travelTime: distTime,
          routeId: depRoute.id,
          lineType: lineTypeMap.get(line.lineTypeId)?.nameSingular,
          signature: depRoute.signature,
          departures: baseTimes.map((t) => ({
            time: t + startOffset,
            key: `${line.name}-${t}-${depRoute.id}`,
          })),
          lineName: line.name,
          lineColor: depRoute.color || "#000000",
          isNight: route.isNight,
          depRouteId: depRoute.id,
        } as RideConnection);
      }
    }
  }

  const spatial = new SpatialIndex();
  stops.forEach(spatial.add);

  for (const stop of stops) {
    const siblings = stopsByGroup.get(stop.groupId) || [];
    siblings.forEach((targetId) => {
      if (targetId !== stop.id) {
        connections.get(stop.id)?.transfers.push({
          to: targetId,
          transferTime: CONFIG.TRANSFER_MINUTES,
          type: "intra-group",
        } as any);
      }
    });

    spatial.getNearby(stop.lon, stop.lat).forEach((neighbor) => {
      if (neighbor.stopId === stop.id) return;

      if (stopInfo.get(neighbor.stopId)?.groupId === stop.groupId) return;

      const dist = getPreciseDistance(
        { lat: stop.lat, lon: stop.lon },
        { lat: neighbor.lat, lon: neighbor.lon }
      );

      if (dist <= CONFIG.WALK_LIMIT_METERS) {
        const walkTimeMinutes = Math.ceil(
          dist / CONFIG.WALK_SPEED_METERS_PER_MIN
        );

        connections.get(stop.id)?.transfers.push({
          to: neighbor.stopId,
          transferTime: walkTimeMinutes,
          type: "inter-group",
        } as any);
      }
    });
  }

  initializeRouter(connections, stopsByGroup);
  return {
    connections,
    stopInfo,
    stopsByGroup,
    lineMap,
    lineTypeMap,
    fullRoutesByRoute,
    depRoutes,
    additionalByDep,
    routeGeometryByDep,
  };
};
