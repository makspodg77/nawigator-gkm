import { getPreciseDistance } from "geolib";
import { Connection, IStop, Journey, StopToGroupMap } from "../models/models";
import { Connections, Stop } from "../models/preprocessModels";

// 🎀 Configuration
const CONFIG = {
  WALK_SPEED: 80, // meters per minute
  TRANSFER_PENALTY: 15, // Score penalty (not time)
  MAX_WALK_TIME: 15, // minutes
  MAX_TRANSFERS: 4,
  MIN_TRANSFER_TIME: 2, // minutes buffer for transfers
};

const MAX_WALK_DISTANCE = CONFIG.MAX_WALK_TIME * CONFIG.WALK_SPEED;
let cachedSortedConnections: Connection[] = [];

// --- 1. Helper: Find Nearby Stops ---

async function findNearbyStops(
  lat: number,
  lon: number,
  stopInfo: Map<number, Stop>
) {
  const nearbyStops = [];
  for (const [stopId, info] of stopInfo) {
    const distance = getPreciseDistance(
      { latitude: lon, longitude: lat },
      { latitude: info.lon, longitude: info.lat }
    );
    if (distance <= MAX_WALK_DISTANCE) {
      nearbyStops.push({
        stopId,
        info,
        distance,
        // Calculate simple walk time first
        walkTime: Math.ceil(distance / CONFIG.WALK_SPEED),
      });
    }
  }

  if (nearbyStops.length === 0) return [];

  // Sort by distance to prioritize closest stops
  return nearbyStops.sort((a, b) => a.distance - b.distance).slice(0, 15);
}

// --- 2. Core CSA Logic ---

export async function csaCoordinateRouting(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  connections: Map<number, Connections>,
  stopInfo: Map<number, Stop>,
  stopsByGroup: Map<number, number[]>
) {
  const originStops = await findNearbyStops(lat1, lon1, stopInfo);
  const destStops = await findNearbyStops(lat2, lon2, stopInfo);

  if (!originStops.length || !destStops.length) {
    return {
      success: false,
      error: "No stops found within walking distance.",
      routes: [],
    };
  }

  // Ensure router is initialized
  if (cachedSortedConnections.length === 0) {
    initializeRouter(connections, stopsByGroup);
  }

  const routes = connectionScanAllDay(
    originStops,
    destStops,
    connections,
    stopInfo
  );

  const formattedRoutes = routes.map((route, idx) => {
    const segments = buildJourneyDetails(route, stopInfo);
    const weightedScore = calculateRouteScore(route);

    return {
      id: idx + 1,
      departure: formatTime(route.departure),
      arrival: formatTime(route.arrival),
      departureMinutes: route.departure,
      arrivalMinutes: route.arrival,
      duration: route.arrival - route.departure,
      transfers: route.transfers,
      score: weightedScore,
      segments,
      // Metadata for frontend
      summary: {
        legs: segments.filter((s) => s.type === "transit").length,
        totalWalkDist:
          (route.initialWalkDistance || 0) + (route.finalWalkDistance || 0),
      },
    };
  });

  return {
    success: true,
    routes: formattedRoutes.sort((a, b) => a.arrivalMinutes - b.arrivalMinutes),
  };
}

function connectionScanAllDay(
  originStops: IStop[],
  destinationStops: IStop[],
  connections: Map<number, Connections>,
  stopInfo: Map<number, Stop>
) {
  const startTime = 0; // Midnight
  const endTime = 1440 + 240; // up to 04:00 next day

  // We scan in windows to avoid processing the whole day if a good route is found early
  const SCAN_WINDOW = 60;
  const allRoutes = [];
  const startIdx = binarySearchStartIndex(cachedSortedConnections, startTime);

  // Optimization: Only scan from the closest few origins to save time
  const primaryOrigins = originStops.slice(0, 5);

  for (let time = startTime; time < endTime; time += SCAN_WINDOW) {
    // If we have plenty of routes, stop
    if (allRoutes.length > 5) break;

    // Advance start index based on time window
    const windowStartIdx = binarySearchStartIndex(
      cachedSortedConnections,
      time,
      startIdx
    );

    const windowRoutes = scanWindow(
      primaryOrigins,
      destinationStops,
      cachedSortedConnections,
      connections,
      time,
      windowStartIdx
    );

    allRoutes.push(...windowRoutes);
  }

  return filterAndDeduplicateRoutes(allRoutes);
}

function scanWindow(
  originStops: IStop[],
  destStops: IStop[],
  allConnections: Connection[],
  connectionsMap: Map<number, Connections>,
  windowStart: number,
  startIndex: number
) {
  // Best arrival time at stop X
  const reachable = new Map<number, number>();
  // How we got to stop X (for reconstruction)
  const journeyMap = new Map<number, Journey>();

  const foundRoutes = [];
  let journeyIdCounter = 0;

  // 1. Initialize Origins
  for (const origin of originStops) {
    const arrivalAtOrigin = windowStart + origin.walkTime;

    if (
      !reachable.has(origin.stopId) ||
      reachable.get(origin.stopId)! > arrivalAtOrigin
    ) {
      reachable.set(origin.stopId, arrivalAtOrigin);

      const startJourney: Journey = {
        id: journeyIdCounter++,
        arrival: arrivalAtOrigin,
        prevStop: null,
        prevConn: null,
        prevJourneyId: null,
        routeId: null,
        transfers: 0,
        departureTime: windowStart, // You leave your house at windowStart
        originStopId: origin.stopId,
        originWalkTime: origin.walkTime,
      };
      journeyMap.set(origin.stopId, startJourney);

      // Apply initial transfers (e.g. walking to adjacent platforms)
      applyDirectTransfers(
        origin.stopId,
        arrivalAtOrigin,
        startJourney,
        connectionsMap,
        reachable,
        journeyMap
      );
    }
  }

  // 2. Main Scan Loop
  for (let i = startIndex; i < allConnections.length; i++) {
    const conn = allConnections[i];

    // Stop if we are way past the window (optimization)
    if (conn.departure > windowStart + 120) break;

    const arrivalAtFromStop = reachable.get(conn.fromStop);

    // Can we catch this connection?
    // We must arrive at 'fromStop' before 'conn.departure'
    if (arrivalAtFromStop === undefined || arrivalAtFromStop > conn.departure)
      continue;

    const prevJourney = journeyMap.get(conn.fromStop);
    if (!prevJourney) continue; // Should not happen if reachable is set

    // Check transfers count
    const isTransfer =
      prevJourney.routeId !== null && prevJourney.routeId !== conn.routeId;
    const currentTransfers = prevJourney.transfers + (isTransfer ? 1 : 0);

    if (currentTransfers > CONFIG.MAX_TRANSFERS) continue;

    // RELAXATION: Have we found a better way to 'conn.toStop'?
    const currentBestAtTarget = reachable.get(conn.toStop);

    // We update if we arrive earlier OR if we haven't been there yet
    if (
      currentBestAtTarget === undefined ||
      conn.arrival < currentBestAtTarget
    ) {
      reachable.set(conn.toStop, conn.arrival);

      const newJourney: Journey = {
        id: journeyIdCounter++,
        arrival: conn.arrival,
        prevStop: conn.fromStop,
        prevConn: conn,
        prevJourneyId: prevJourney.id,
        routeId: conn.routeId,
        transfers: currentTransfers,
        departureTime: prevJourney.departureTime,
        originStopId: prevJourney.originStopId,
        originWalkTime: prevJourney.originWalkTime,
      };

      journeyMap.set(conn.toStop, newJourney);

      // Handle transfers at the destination stop immediately
      applyDirectTransfers(
        conn.toStop,
        conn.arrival,
        newJourney,
        connectionsMap,
        reachable,
        journeyMap
      );
    }
  }

  // 3. Extract Routes
  for (const dest of destStops) {
    if (reachable.has(dest.stopId)) {
      const finalJourney = journeyMap.get(dest.stopId);
      const route = reconstructRoute(finalJourney, journeyMap, dest);
      if (route) foundRoutes.push(route);
    }
  }

  return foundRoutes;
}

// Simplified Transfer Logic: Only look at immediate neighbors
// Deep recursion is bad for CSA performance.
function applyDirectTransfers(
  stopId: number,
  arrivalTime: number,
  prevJourney: Journey,
  connectionsMap: Map<number, Connections>,
  reachable: Map<number, number>,
  journeyMap: Map<number, Journey>
) {
  const stopData = connectionsMap.get(stopId);
  if (!stopData || !stopData.transfers) return;

  for (const transfer of stopData.transfers) {
    const arrivalAtNeighbor = arrivalTime + transfer.transferTime;
    const neighborId = transfer.to;

    const currentBest = reachable.get(neighborId);

    // Only walk if it's faster than what we already found
    if (currentBest === undefined || arrivalAtNeighbor < currentBest) {
      reachable.set(neighborId, arrivalAtNeighbor);

      journeyMap.set(neighborId, {
        ...prevJourney, // Inherit origin info
        id: prevJourney.id + 100000, // Just a unique shift
        arrival: arrivalAtNeighbor,
        prevStop: stopId,
        prevJourneyId: prevJourney.id,
        // Mark this segment as a transfer
        prevConn: {
          type: "transfer",
          transferTime: transfer.transferTime,
          transferType: transfer.type,
        } as any,
        routeId: prevJourney.routeId, // Keep route ID so walking doesn't count as a "vehicle transfer" score-wise if not needed
      });
    }
  }
}

// --- 3. Path Reconstruction (FIXED) ---

function reconstructRoute(
  finalJourney: Journey,
  journeyMap: Map<number, Journey>,
  destStopInfo: IStop
) {
  const segments = [];
  let current = finalJourney;

  // 1. Backtrack to build the chain of nodes
  const pathNodes = [];
  while (current) {
    pathNodes.unshift(current);
    if (!current.prevJourneyId) break;
    // We must find the exact journey object by ID (simulated here by looking up the Map is imperfect but works for CSA-with-Map)
    // Note: In a full implementation, allJourneys should be stored.
    // Here we rely on the fact that journeyMap stores the *best* journey to that stop.
    // However, the 'prevStop' is reliable.
    if (current.prevStop === null) break;

    // Look up the journey at the previous stop
    // CAUTION: The map stores the *best* arrival at prevStop.
    // This assumes the best path to Current went through the best path to Prev.
    // This is the Optimality Principle of Dijkstra/CSA.
    const prev = journeyMap.get(current.prevStop);
    if (!prev) break; // Should not happen
    current = prev;
  }

  if (pathNodes.length < 2) return null;

  // 2. Convert nodes into Legs
  // pathNodes[0] is Origin. pathNodes[1] is the first move (Walk or Ride).

  let currentLeg = null;

  for (let i = 1; i < pathNodes.length; i++) {
    const node = pathNodes[i];
    const prevNode = pathNodes[i - 1];
    const conn = node.prevConn;

    if (!conn) continue;

    if (conn.type === "transfer" || (conn as any).transferType) {
      // It's a walk/transfer
      // If we were building a transit leg, push it
      if (currentLeg) {
        segments.push(currentLeg);
        currentLeg = null;
      }
      // Usually we don't visualize internal transfers as "Legs" unless they are long walks.
      // But we need to account for the time.
    } else {
      // It's a Transit Connection
      const transitConn = conn as Connection;

      if (currentLeg && currentLeg.routeId === transitConn.routeId) {
        // CONTINUATION of same line -> extend the leg
        currentLeg.to = transitConn.toStop;
        currentLeg.arrival = transitConn.arrival;
      } else {
        // NEW Line or First Line
        if (currentLeg) segments.push(currentLeg);

        currentLeg = {
          type: "transit",
          from: transitConn.fromStop,
          to: transitConn.toStop,
          departure: transitConn.departure,
          arrival: transitConn.arrival,
          routeId: transitConn.routeId,
          line: transitConn.lineName,
          lineColor: transitConn.lineColor,
          lineType: transitConn.lineType,
          key: transitConn.key,
          signature: transitConn.signature,
        };
      }
    }
  }

  if (currentLeg) segments.push(currentLeg);

  if (segments.length === 0) return null;

  // 3. Final Assembly
  const firstLeg = segments[0];
  const lastLeg = segments[segments.length - 1];

  return {
    originStop: firstLeg.from,
    destStop: lastLeg.to,
    initialWalk: finalJourney.originWalkTime,
    initialWalkDistance: null, // Can be populated if passed down
    finalWalk: destStopInfo.walkTime, // Walk from last stop to lat/lon
    finalWalkDistance: destStopInfo.distance,

    // Time user leaves house
    departure: firstLeg.departure - finalJourney.originWalkTime,
    // Time user arrives at destination lat/lon
    arrival: lastLeg.arrival + destStopInfo.walkTime,

    actualDeparture: firstLeg.departure,
    transfers: segments.length - 1,
    legs: segments,
    key: segments.map((s) => s.key).join("|"),
  };
}

// --- 4. Utilities ---

export function initializeRouter(
  connections: Map<number, Connections>,
  stopsByGroup: Map<number, number[]>
) {
  cachedSortedConnections = [];
  const groupMap = new Map<number, number>();

  for (const [groupId, stops] of stopsByGroup) {
    for (const stopId of stops) groupMap.set(stopId, groupId);
  }

  for (const [fromId, data] of connections) {
    if (!data.rides) continue;
    for (const ride of data.rides) {
      if (!ride.departures) continue;
      for (const dep of ride.departures) {
        // Flatten into simple Connection objects
        cachedSortedConnections.push(
          new Connection(
            fromId,
            ride.to,
            dep.time,
            dep.key,
            groupMap.get(fromId) || 0,
            dep.time + ride.travelTime,
            ride.depRouteId || 0, // Ensure routeId is number
            ride.lineName,
            0, // LineType placeholder
            ride.lineColor,
            ride.signature || ""
          )
        );
      }
    }
  }

  // CRITICAL: Sort by departure time for CSA to work
  cachedSortedConnections.sort((a, b) => a.departure - b.departure);
  console.log(
    `[Router] Initialized with ${cachedSortedConnections.length} connections.`
  );
}

function binarySearchStartIndex(
  schedule: Connection[],
  time: number,
  startFrom = 0
) {
  let l = startFrom,
    r = schedule.length - 1,
    ans = schedule.length;
  while (l <= r) {
    const mid = (l + r) >>> 1;
    if (schedule[mid].departure >= time) {
      ans = mid;
      r = mid - 1;
    } else {
      l = mid + 1;
    }
  }
  return ans;
}

function calculateRouteScore(route: any) {
  const travelTime = route.arrival - route.departure;
  const walkPenalty = (route.initialWalk + route.finalWalk) * 2;
  const transferPenalty = route.transfers * CONFIG.TRANSFER_PENALTY;
  return travelTime + walkPenalty + transferPenalty;
}

function filterAndDeduplicateRoutes(routes: any[]) {
  return routes;
  const seen = new Set();
  return routes
    .sort((a, b) => calculateRouteScore(a) - calculateRouteScore(b))
    .filter((r) => {
      const k = `${r.actualDeparture}-${r.arrival}-${r.transfers}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 5); // Return top 5 distinct routes
}

function buildJourneyDetails(route: any, stopInfo: Map<number, Stop>) {
  const details = [];

  if (route.initialWalk > 0) {
    details.push({
      type: "walk",
      fromName: "Start Location",
      toName: getStopName(route.originStop, stopInfo),
      duration: route.initialWalk,
      distance: route.initialWalk * CONFIG.WALK_SPEED,
    });
  }

  route.legs.forEach((leg: any) => {
    details.push({
      type: "transit",
      fromName: getStopName(leg.from, stopInfo),
      toName: getStopName(leg.to, stopInfo),
      line: leg.line,
      lineColor: leg.lineColor,
      duration: leg.arrival - leg.departure,
      departure: formatTime(leg.departure),
      arrival: formatTime(leg.arrival),
    });
  });

  if (route.finalWalk > 0) {
    details.push({
      type: "walk",
      fromName: getStopName(route.destStop, stopInfo),
      toName: "Destination",
      duration: route.finalWalk,
      distance: route.finalWalk * CONFIG.WALK_SPEED,
    });
  }
  return details;
}

function getStopName(id: number, map: Map<number, Stop>) {
  const s = map.get(id);
  console.log(s);
  return s ? s.groupName || `Stop ${id}` : `Stop ${id}`;
}

function formatTime(m: number) {
  if (isNaN(m)) return "--:--";
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

export default { csaCoordinateRouting, initializeRouter };
