import { getPreciseDistance } from "geolib";

const WALK_SPEED = 80; // meters per minute
import {
  Connection,
  IRoute,
  IStop,
  ITransferSegment,
  ITransitSegment,
  Journey,
  StopToGroupMap,
} from "../models/models";
import { Connections, Route, Stop } from "../models/preprocessModels";
const TRANSFER_PENALTY = 25; // minutes penalty for each transfer (increased)
const WALK_PENALTY_MULTIPLIER = 5; // strongly penalize walking (2x priority vs transfers)
let cachedSortedConnections: Connection[] = [];
const MAX_WALK_TIME = 12; // minutes (maximum acceptable walking time)
const MAX_WALK_DISTANCE = MAX_WALK_TIME * WALK_SPEED; // 960 meters

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
      nearbyStops.push({ stopId, info, distance });
    }
  }

  if (nearbyStops.length === 0) return [];

  const BATCH_SIZE = 25;
  const allDistances: IStop[] = [];

  for (let i = 0; i < nearbyStops.length; i += BATCH_SIZE) {
    const batch = nearbyStops.slice(i, i + BATCH_SIZE);
    const destinations = batch
      .map((s) => `${s.info.lon},${s.info.lat}`)
      .join("|");

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lon},${lat}&destinations=${destinations}&mode=walking&units=metric&key=${process.env.GOOGLE_KEY}`
    );

    const data = await res.json();

    batch.forEach((stop, idx) => {
      const element = data.rows[0].elements[idx];

      if (element.status === "OK") {
        allDistances.push({
          stopId: stop.stopId,
          distance: element.distance.value,
          walkTime: Math.ceil(element.distance.value / WALK_SPEED),
          stopInfo: stop.info,
        });
      } else {
        allDistances.push({
          stopId: stop.stopId,
          distance: stop.distance,
          walkTime: Math.ceil(stop.distance / WALK_SPEED),
          stopInfo: stop.info,
        });
      }
    });
  }

  return allDistances.sort((a, b) => a.distance - b.distance);
}
function applyTransfers(
  stopId: number,
  arrivalTime: number,
  routeId: number | null,
  transfers: number,
  connections: Map<number, Connections>,
  reachable: { [stopId: number]: number },
  journeyMap: { [stopId: number]: Journey },
  allJourneys: { [stopId: number]: Journey[] },
  journeyIdCounter: { val: number },
  originData: { stopId: number; walkTime: number; distance: number }
) {
  const stopConn = connections.get(stopId);
  if (!stopConn || !stopConn.transfers) return;

  const MAX_TRANSFER_DEPTH = 10; // Reduced from 100 to prevent infinite walk loops
  const queue = [
    {
      stopId,
      arrivalTime,
      routeId,
      transfers,
      depth: 0,
      parentJourneyId: journeyMap[stopId]?.id,
    },
  ]; // Added parentJourneyId tracking
  const processed = new Set();

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;

    const {
      stopId: currentStop,
      arrivalTime: currentTime,
      transfers: currentTransfers,
      depth,
      parentJourneyId, // Use the specific parent ID from the queue
    } = next;

    if (depth >= MAX_TRANSFER_DEPTH) continue;

    const key = `${currentStop}-${currentTime}`;
    if (processed.has(key)) continue;
    processed.add(key);

    const currentConn = connections.get(currentStop);
    if (!currentConn || !currentConn.transfers) continue;

    for (const transfer of currentConn.transfers) {
      const newTransfers =
        currentTransfers + (transfer.type === "inter-group" ? 1 : 0);
      const transferArrival = currentTime + transfer.transferTime;
      const currentReach = reachable[transfer.to];

      // Optimization: Only process if we improve arrival time
      if (currentReach === undefined || transferArrival < currentReach) {
        reachable[transfer.to] = transferArrival;

        const journeyEntry: Journey = {
          id: journeyIdCounter.val++,
          arrival: transferArrival,
          prevStop: currentStop,
          prevConn: {
            type: "transfer",
            transferTime: transfer.transferTime,
            groupName: transfer.groupName,
            transferType: transfer.type,
          },
          prevJourneyId: parentJourneyId, // Link to the specific parent from queue
          routeId: null, // FIX: Transfers reset the routeId (you are walking, not on a bus)
          transfers: newTransfers,
          departureTime: journeyMap[currentStop]?.departureTime || 0,
          originStopId: originData.stopId,
          originWalkTime: originData.walkTime,
          originWalkDistance: originData.distance, // ADDED: Track origin distance
        };

        journeyMap[transfer.to] = journeyEntry;

        if (!allJourneys[transfer.to]) {
          allJourneys[transfer.to] = [];
        }
        allJourneys[transfer.to].push(journeyEntry);

        if (depth + 1 < MAX_TRANSFER_DEPTH) {
          queue.push({
            stopId: transfer.to,
            arrivalTime: transferArrival,
            routeId: null, // Walking resets route
            transfers: newTransfers,
            depth: depth + 1,
            parentJourneyId: journeyEntry.id, // Pass this new ID as parent for next depth
          });
        }
      }
    }
  }
}
/**
 * Main CSA function - All-day coordinate-based routing
 */
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
  if (originStops.length === 0 || destStops.length === 0) {
    return {
      success: false,
      error:
        originStops.length === 0
          ? "No stops found near origin coordinates"
          : "No stops found near destination coordinates",
      routes: [],
    };
  }

  const routes: IRoute[] = connectionScanAllDay(
    originStops,
    destStops,
    connections,
    stopsByGroup
  );
  const formattedRoutes = routes.map((route, idx) => {
    const segments = buildJourneyDetails(route, stopInfo);
    const transitTime = route.arrival - route.actualDeparture;
    const totalWalk = route.initialWalk + route.finalWalk;

    const weightedScore = calculateRouteScore(route);
    return {
      id: idx + 1,
      departure: formatTime(route.actualDeparture - route.initialWalk),
      arrival: formatTime(route.arrival + route.finalWalk),
      departureMinutes: route.actualDeparture - route.initialWalk,
      arrivalMinutes: route.arrival + route.finalWalk,
      key: route.key,
      duration:
        route.arrival +
        route.finalWalk -
        (route.actualDeparture - route.initialWalk),
      transfers: route.transfers,
      weightedScore,
      segments,
      summary: {
        totalWalkTime: totalWalk,
        totalTransitTime: transitTime,
        legs: segments.filter((s) => s.type === "transit").length,
        initialWalk:
          route.initialWalk > 0
            ? `${route.initialWalk}min (${Math.round(
                route.initialWalkDistance
              )}m)`
            : "None",
        finalWalk:
          route.finalWalk > 0
            ? `${route.finalWalk}min (${Math.round(route.finalWalkDistance)}m)`
            : "None",
      },
    };
  });

  return {
    success: true,
    routes: formattedRoutes.sort((a, b) => a.weightedScore - b.weightedScore),
    metadata: {
      origin: {
        lat: lat1,
        lon: lon1,
        nearbyStops: originStops.length,
        closestStop: originStops[0]
          ? {
              id: originStops[0].stopId,
              name: getStopName(originStops[0].stopId, stopInfo),
              distance: originStops[0].distance,
              walkTime: originStops[0].walkTime,
            }
          : null,
      },
      destination: {
        lat: lat2,
        lon: lon2,
        nearbyStops: destStops.length,
        closestStop: destStops[0]
          ? {
              id: destStops[0].stopId,
              name: getStopName(destStops[0].stopId, stopInfo),
              distance: destStops[0].distance,
              walkTime: destStops[0].walkTime,
            }
          : null,
      },
      routesFound: formattedRoutes.length,
    },
  };
}

// Optimize connectionScanAllDay
function connectionScanAllDay(
  originStops: IStop[],
  destinationStops: IStop[],
  connections: Map<number, Connections>,
  stopsByGroup: Map<number, number[]>
) {
  const maxTransfers = 5;
  const startTime = 972;
  const endTime = 1100;

  if (cachedSortedConnections.length === 0) {
    initializeRouter(connections, stopsByGroup);
  }

  const fullSchedule = cachedSortedConnections;
  let globalStartIndex = binarySearchStartIndex(fullSchedule, startTime);
  const SCAN_WINDOW = 10;
  const allRoutes = [];

  const sortedOrigins = [...originStops].sort(
    (a, b) => a.walkTime - b.walkTime
  );
  for (const origin of sortedOrigins) {
    for (let time = startTime; time < endTime; time += SCAN_WINDOW) {
      const windowStart = time;

      let windowStartIndex = binarySearchStartIndex(
        fullSchedule,
        windowStart,
        globalStartIndex
      );

      const windowRoutes = scanWindow(
        origin,
        destinationStops,
        fullSchedule,
        connections,
        maxTransfers,
        windowStart,
        windowStartIndex
      );

      allRoutes.push(...windowRoutes);
    }
  }
  return filterAndDeduplicateRoutes(allRoutes);
}

function scanWindow(
  origin: IStop,
  destinationStops: IStop[],
  allConnections: Connection[],
  connections: Map<number, Connections>,
  maxTransfers: number,
  windowStart: number,
  startIndex: number
) {
  const foundRoutes = [];

  const reachable: { [stopId: number]: number } = {};
  const journeyMap: { [stopId: number]: Journey } = {};
  const allJourneys: { [stopId: number]: Journey[] } = {};
  let journeyIdCounter = 0;

  const originTime = windowStart + origin.walkTime;

  reachable[origin.stopId] = originTime;
  const originJourney: Journey = {
    id: journeyIdCounter++,
    arrival: originTime,
    prevStop: null,
    prevConn: null,
    prevJourneyId: null,
    routeId: null,
    transfers: 0,
    departureTime: windowStart,
    originStopId: origin.stopId,
    originWalkTime: origin.walkTime,
    originWalkDistance: origin.distance,
  };

  journeyMap[origin.stopId] = originJourney;

  allJourneys[origin.stopId] = [originJourney];

  const counterObj = { val: journeyIdCounter };

  applyTransfers(
    origin.stopId,
    originTime,
    null,
    0,
    connections,
    reachable,
    journeyMap,
    allJourneys,
    counterObj,
    {
      stopId: origin.stopId,
      walkTime: origin.walkTime,
      distance: origin.distance,
    }
  );
  journeyIdCounter = counterObj.val;

  for (let i = startIndex; i < allConnections.length; i++) {
    const conn = allConnections[i];

    if (conn.departure > windowStart + 240) break; // 4 hours max

    const fromReachTime = reachable[conn.fromStop];

    if (fromReachTime === undefined || fromReachTime > conn.departure) continue;

    const fromJourney = journeyMap[conn.fromStop];
    if (!fromJourney) continue;

    const isTransfer =
      fromJourney.routeId !== null && fromJourney.routeId !== conn.routeId;
    const newTransfers = isTransfer
      ? fromJourney.transfers + 1
      : fromJourney.transfers;

    if (newTransfers > maxTransfers) continue;

    const currentReach = reachable[conn.toStop];

    const newJourney = {
      id: journeyIdCounter++,
      arrival: conn.arrival,
      prevStop: conn.fromStop,
      prevConn: conn,
      prevJourneyId: fromJourney.id,
      routeId: conn.routeId,
      transfers: newTransfers,
      departureTime: fromJourney.departureTime,
      originStopId: fromJourney.originStopId,
      originWalkTime: fromJourney.originWalkTime,
      originWalkDistance: fromJourney.originWalkDistance,
    };

    if (currentReach === undefined || conn.arrival < currentReach) {
      reachable[conn.toStop] = conn.arrival;
      journeyMap[conn.toStop] = newJourney;
    }

    if (!allJourneys[conn.toStop]) {
      allJourneys[conn.toStop] = [];
    }
    allJourneys[conn.toStop].push(newJourney);

    const counterRef = { val: journeyIdCounter };
    applyTransfers(
      conn.toStop,
      conn.arrival,
      conn.routeId,
      newTransfers,
      connections,
      reachable,
      journeyMap,
      allJourneys,
      counterRef,
      {
        stopId: fromJourney.originStopId ?? 0,
        walkTime: fromJourney.originWalkTime ?? 0,
        distance: fromJourney.originWalkDistance,
      }
    );
    journeyIdCounter = counterRef.val;
  }

  const destStopMap = new Map(destinationStops.map((d) => [d.stopId, d]));

  for (const dest of destinationStops) {
    if (!reachable[dest.stopId]) continue;

    const journeysToStop = allJourneys[dest.stopId] || [];
    for (const journey of journeysToStop) {
      const route = reconstructRouteFromJourney(
        journey,
        allJourneys,
        destStopMap
      );
      if (route) {
        foundRoutes.push(route);
      }
    }
  }
  return foundRoutes;
}
export function initializeRouter(
  connections: Map<number, Connections>,
  stopsByGroup: Map<number, number[]>
) {
  if (cachedSortedConnections.length > 0) return;
  let cachedStopToGroupMap: StopToGroupMap = new Map();
  for (const [groupId, stopIds] of stopsByGroup) {
    for (const stopId of stopIds) {
      cachedStopToGroupMap.set(stopId, groupId);
    }
  }
  for (const [fromStopId, conn] of connections) {
    for (const ride of conn.rides) {
      if (!ride.departures) continue;
      const groupId = cachedStopToGroupMap.get(fromStopId);
      if (groupId) {
        for (const depTime of ride.departures) {
          cachedSortedConnections.push(
            new Connection(
              fromStopId,
              ride.to,
              depTime.time,
              depTime.key,
              groupId,
              depTime.time + ride.travelTime,
              ride.routeId,
              ride.lineName,
              ride.lineType,
              ride.lineColor,
              ride.signature
            )
          );
        }
      }
    }
  }
  cachedSortedConnections.sort((a, b) => a.departure - b.departure);
}

function reconstructRouteFromJourney(
  destJourney: Journey,
  allJourneys: { [stopId: number]: Journey[] },
  destStopMap: Map<number, IStop>
) {
  const pathSegments: (ITransitSegment | ITransferSegment)[] = []; // Unified array for all path segments
  let currentJourney = destJourney;
  const path = [];
  // 1. Trace the path backwards from destination to origin
  while (currentJourney !== null) {
    path.unshift({
      stop: currentJourney.prevStop,
      arrival: currentJourney.arrival,
      conn: currentJourney.prevConn,
      routeId: currentJourney.routeId,
    });

    if (currentJourney.prevJourneyId === null) break;

    const prevStop = currentJourney.prevStop;
    if (typeof prevStop === "number") {
      const journeysAtPrev = allJourneys[prevStop] || [];
      const foundJourney = journeysAtPrev.find(
        (j) => j.id === currentJourney.prevJourneyId
      );

      if (!foundJourney) throw new Error("Previous journey not found");
      currentJourney = foundJourney;
    } else {
      break;
    }
  }

  // 2. Build unified pathSegments with transfers AND transits in order
  let i = 1;
  while (i < path.length) {
    const conn = path[i]?.conn;
    if (!conn) {
      i++;
      continue;
    }

    // Handle transit legs (merge consecutive segments on same route)
    const legStart = i;
    const routeId = path[i].routeId;

    let legEnd = i;
    while (legEnd + 1 < path.length) {
      const nextConn = path[legEnd + 1].conn;
      if (
        !nextConn ||
        nextConn.type === "transfer" ||
        path[legEnd + 1].routeId !== routeId
      ) {
        break;
      }
      legEnd++;
    }

    const firstConn = path[legStart].conn;
    const lastConn = path[legEnd].conn;
    const lastArrival = path[legEnd].arrival;

    if (
      firstConn &&
      "fromStop" in firstConn &&
      lastConn &&
      "toStop" in lastConn
    ) {
      pathSegments.push({
        type: "transit",
        from: firstConn.fromStop ?? -1,
        to: lastConn.toStop ?? -1,
        departure: firstConn.departure ?? -1,
        arrival: lastArrival ?? -1,
        routeId,
        key: firstConn.key,
        line: firstConn.lineName,
        lineType: firstConn.lineType,
        lineColor: firstConn.lineColor,
        signature: firstConn.signature,
      });
    }

    i = legEnd + 1;
  }

  // 3. Validation - need at least one transit segment
  const transitSegments = pathSegments.filter((s) => s.type === "transit");
  if (transitSegments.length === 0) return null;

  // Get final destination info
  const finalStopId = transitSegments[transitSegments.length - 1].to;
  const destInfo = destStopMap.get(finalStopId);
  if (!destInfo) return null;

  return {
    originStop: destJourney.originStopId,
    destStop: finalStopId,
    initialWalk: destJourney.originWalkTime,
    initialWalkDistance: destJourney.originWalkDistance,
    key: transitSegments.map((leg) => leg.key).join("-"),
    finalWalk: destInfo.walkTime,
    finalWalkDistance: destInfo.distance,
    departure: transitSegments[0].departure - destJourney.originWalkTime,
    arrival: transitSegments[transitSegments.length - 1].arrival,
    actualDeparture: transitSegments[0].departure,
    transfers: transitSegments.length - 1,
    pathSegments,
  };
}
const SCORING_CONFIG = {
  WALK_RELUCTANCE: 2.5,
  WAIT_RELUCTANCE: 1.5,

  TRANSFER_FIXED_PENALTY: 15,

  RISK_THRESHOLD_MIN: 4,
  RISK_EXPONENT_FACTOR: 30,

  WALK_THRESHOLD_SOFT: 5,
  WALK_PENALTY_HARD: 1.5,
};

function calculateRouteScore(route: IRoute): number {
  if (!route.pathSegments || route.pathSegments.length === 0) {
    return (
      (route.initialWalk + route.finalWalk) * SCORING_CONFIG.WALK_RELUCTANCE
    );
  }

  let rideTime = 0;
  let transferWaitTime = 0;
  let riskPenalty = 0;

  const segments = route.pathSegments.sort((a, b) => a.departure - b.departure);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    rideTime += segment.arrival - segment.departure;

    if (i < segments.length - 1) {
      const nextSegment = segments[i + 1];

      const gap = nextSegment.departure - segment.arrival;

      const transferDuration = Math.max(0, gap);
      transferWaitTime += transferDuration;

      if (transferDuration < SCORING_CONFIG.RISK_THRESHOLD_MIN) {
        riskPenalty +=
          Math.pow(SCORING_CONFIG.RISK_THRESHOLD_MIN - transferDuration, 2) * 2;

        if (transferDuration < 1) riskPenalty += 100;
      }
    }
  }

  const totalWalk = route.initialWalk + route.finalWalk;
  let weightedWalk = 0;

  if (totalWalk <= SCORING_CONFIG.WALK_THRESHOLD_SOFT) {
    weightedWalk = totalWalk * SCORING_CONFIG.WALK_RELUCTANCE;
  } else {
    const cheapWalk = SCORING_CONFIG.WALK_THRESHOLD_SOFT;
    const expensiveWalk = totalWalk - SCORING_CONFIG.WALK_THRESHOLD_SOFT;

    weightedWalk =
      cheapWalk * SCORING_CONFIG.WALK_RELUCTANCE +
      expensiveWalk *
        (SCORING_CONFIG.WALK_RELUCTANCE + SCORING_CONFIG.WALK_PENALTY_HARD);
  }

  const score =
    rideTime +
    weightedWalk +
    transferWaitTime * SCORING_CONFIG.WAIT_RELUCTANCE +
    route.transfers * SCORING_CONFIG.TRANSFER_FIXED_PENALTY +
    riskPenalty;

  return Math.round(score);
}

function filterAndDeduplicateRoutes(routes: IRoute[]) {
  if (!routes.length) return [];
  const scoredRoutes = routes.map((route) => ({
    route,
    score: calculateRouteScore(route),
  }));

  scoredRoutes.sort((a, b) => a.score - b.score);
  const bestScore = scoredRoutes[0].score;

  const filteredRoutes = scoredRoutes.filter(
    (route) => route.score <= bestScore * 1.5
  );

  const seenKeys = new Set();
  const seenDepartures = new Set();
  const seenArrivals = new Set();
  const seenFeet = new Set();
  const result = [];

  for (const { route } of filteredRoutes) {
    if (seenKeys.has(route.key)) continue;
    if (seenDepartures.has(route.actualDeparture)) continue;
    if (seenArrivals.has(route.arrival)) continue;
    if (route.pathSegments.some((p) => seenFeet.has(p.key))) continue;
    route.pathSegments.map((p) => p.key).forEach((key) => seenFeet.add(key));
    seenArrivals.add(route.arrival);
    seenKeys.add(route.key);
    seenDepartures.add(route.actualDeparture);
    result.push(route);
  }

  return result;
}

/**
 * Build journey segments for display
 */
function buildJourneyDetails(route: IRoute, stopInfo: Map<number, Stop>) {
  const segments = [];

  // Find the actual first stop we need to be at (might be different from originStop if there are transfers)
  const firstPathStop =
    route.pathSegments && route.pathSegments.length > 0
      ? route.pathSegments[0].type === "transfer"
        ? route.pathSegments[0].from
        : route.pathSegments[0].from
      : route.originStop;

  // Initial walk from origin coordinates to first stop
  if (route.initialWalk > 0) {
    segments.push({
      type: "walk",
      from: "origin",
      to: firstPathStop,
      fromName: "Origin coordinates",
      toName: getStopName(firstPathStop, stopInfo),
      duration: route.initialWalk,
      distance: route.initialWalkDistance,
    });
  }

  // Build segments from the complete path (transfers + transits in order)
  for (const pathSeg of route.pathSegments || []) {
    if (pathSeg.type === "transfer") {
      // Inter-group transfers are walks between different stop groups
      if (pathSeg.transferType === "inter-group") {
        const fromInfo = stopInfo.get(pathSeg.from);
        const toInfo = stopInfo.get(pathSeg.to);
        const distance =
          fromInfo && toInfo
            ? getPreciseDistance(
                { latitude: fromInfo.lat, longitude: fromInfo.lon },
                { latitude: toInfo.lat, longitude: toInfo.lon }
              )
            : pathSeg.duration * WALK_SPEED;

        segments.push({
          type: "walk",
          from: pathSeg.from,
          to: pathSeg.to,
          fromName: getStopName(pathSeg.from, stopInfo),
          toName: getStopName(pathSeg.to, stopInfo),
          duration: pathSeg.duration,
          distance: distance,
        });
      } else {
        // Intra-group transfers (same stop group, e.g., platform changes)
        segments.push({
          type: "transfer",
          from: pathSeg.from,
          to: pathSeg.to,
          fromName: getStopName(pathSeg.from, stopInfo),
          toName: getStopName(pathSeg.to, stopInfo),
          duration: pathSeg.duration,
          transferType: pathSeg.transferType,
        });
      }
    } else if (pathSeg.type === "transit") {
      segments.push({
        type: "transit",
        from: pathSeg.from,
        to: pathSeg.to,
        fromName: getStopName(pathSeg.from, stopInfo),
        toName: getStopName(pathSeg.to, stopInfo),
        departure: pathSeg.departure,
        arrival: pathSeg.arrival,
        duration: pathSeg.arrival - pathSeg.departure,
        line: pathSeg.line,
        key: pathSeg.key,
        routeId: pathSeg.routeId,
        signature: pathSeg.signature,
        lineColor: pathSeg.lineColor,
        lineType: pathSeg.lineType,
      });
    }
  }

  // Final walk from last stop to destination
  if (route.finalWalk > 0) {
    segments.push({
      type: "walk",
      from: route.destStop,
      to: "destination",
      fromName: getStopName(route.destStop, stopInfo),
      toName: "Destination coordinates",
      duration: route.finalWalk,
      distance: route.finalWalkDistance,
    });
  }

  return segments;
}

/**
 * Helper functions
 */
function getStopName(stopId: number, stopInfo: Map<number, Stop>) {
  const info = stopInfo.get(stopId);
  return info?.alias || info?.groupName || `Stop ${stopId}`;
}

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function binarySearchStartIndex(
  schedule: Connection[],
  targetTime: number,
  startFrom: number = 0
) {
  let left = startFrom;
  let right = schedule.length - 1;
  let result = schedule.length;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (schedule[mid].departure >= targetTime) {
      result = mid;
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return result;
}

export default {
  csaCoordinateRouting,
  findNearbyStops,
  initializeRouter,
};
