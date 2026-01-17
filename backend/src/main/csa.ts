import { getPreciseDistance } from "geolib";
import {
  Connection,
  IRoute,
  IStop,
  ITransitSegment,
  Journey,
  StopToGroupMap,
} from "../models/models";
import {
  Connections,
  DepartureRoute,
  FullRoute,
  IRouteGeometry,
  Stop,
} from "../models/preprocessModels";
import { populateRoutes } from "./populateRoutes";

let cachedSortedConnections: Connection[] = [];
const WALK_SPEED = 80; // meters per minute
const MAX_WALK_TIME = 12; // minutes
const MAX_WALK_DISTANCE = MAX_WALK_TIME * WALK_SPEED; // 960 meters

/**
 * Initialize the connections array for csa algorithm
 */
export function initializeRouter(
  connections: Map<number, Connections>,
  stopsByGroup: Map<number, number[]>,
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
              ride.signature,
            ),
          );
        }
      }
    }
  }
  cachedSortedConnections.sort((a, b) => a.departure - b.departure);
}

/**
 * Main CSA function - All-day coordinate-based routing
 */
export async function csaCoordinateRouting(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  startTime: number,
  endTime: number,
  connections: Map<number, Connections>,
  stopInfo: Map<number, Stop>,
  stopsByGroup: Map<number, number[]>,
  depRoutes: DepartureRoute[],
  fullRoutesByRoute: Map<number, FullRoute[]>,
  additionalByDep: Map<number, Set<number>>,
  routeGeometryByDep: Map<number, IRouteGeometry[]>,
) {
  // look for closest stop to given coords
  const originStops = await findNearbyStops(lat1, lon1, stopInfo);
  const destStops = await findNearbyStops(lat2, lon2, stopInfo);
  console.log(destStops);
  // safety check if any stops were found
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

  // call the method spiral 😶😶😑
  const routes: IRoute[] = connectionScanAllDayOptimized(
    originStops,
    destStops,
    connections,
    stopsByGroup,
    startTime,
    endTime,
  );

  // format routes 🤣😂😂😁
  const formattedRoutes = await Promise.all(
    routes.map(async (route, idx) => {
      const segments = await buildJourneyDetails(
        route,
        stopInfo,
        stopsByGroup,
        depRoutes,
        fullRoutesByRoute,
        additionalByDep,
        routeGeometryByDep,
      );

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
          legs: segments.filter((s) => s && s.type === "transit").length,
          initialWalk:
            route.initialWalk > 0
              ? `${route.initialWalk}min (${Math.round(
                  route.initialWalkDistance,
                )}m)`
              : "None",
          finalWalk:
            route.finalWalk > 0
              ? `${route.finalWalk}min (${Math.round(
                  route.finalWalkDistance,
                )}m)`
              : "None",
        },
      };
    }),
  );

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

/**
 * Pre-compute reverse transfer index (call once during initialization)
 */
function buildReverseTransferIndex(
  connections: Map<number, Connections>,
): Map<number, Array<{ from: number; transfer: any }>> {
  const transfersTo = new Map<number, Array<{ from: number; transfer: any }>>();

  for (const [stopId, conn] of connections) {
    if (!conn.transfers) continue;
    for (const transfer of conn.transfers) {
      if (!transfersTo.has(transfer.to)) {
        transfersTo.set(transfer.to, []);
      }
      transfersTo.get(transfer.to)!.push({ from: stopId, transfer });
    }
  }

  return transfersTo;
}

/**
 * Optimized scanWindow - Look for the best connections in given time window
 */
function scanWindowOptimized(
  origin: IStop,
  destinationStops: IStop[],
  allConnections: Connection[],
  connections: Map<number, Connections>,
  maxTransfers: number,
  windowStart: number,
  startIndex: number,
  transfersToIndex: Map<number, Array<{ from: number; transfer: any }>>, // Pre-built index
) {
  const foundRoutes = [];

  // Use Maps instead of plain objects for better performance
  const paretoJourneys = new Map<number, Journey[]>();
  const allJourneys = new Map<number, Journey[]>();
  let journeyIdCounter = 0;

  const MAX_JOURNEYS_PER_STOP = 15; // Prevent journey explosion
  const originTime = windowStart + origin.walkTime;

  // Initialize origin journey
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

  paretoJourneys.set(origin.stopId, [originJourney]);
  allJourneys.set(origin.stopId, [originJourney]);

  // Helper: Check if journey is Pareto-optimal
  function isParetoOptimal(
    newJourney: Journey,
    existingJourneys: Journey[],
  ): boolean {
    for (const existing of existingJourneys) {
      if (
        existing.arrival <= newJourney.arrival &&
        existing.transfers <= newJourney.transfers &&
        (existing.arrival < newJourney.arrival ||
          existing.transfers < newJourney.transfers)
      ) {
        return false;
      }
    }
    return true;
  }

  // Helper: Add journey to Pareto set with limit
  function addParetoJourney(stopId: number, journey: Journey): boolean {
    let existing = paretoJourneys.get(stopId) || [];

    // Remove dominated journeys
    existing = existing.filter(
      (e) =>
        !(
          journey.arrival <= e.arrival &&
          journey.transfers <= e.transfers &&
          (journey.arrival < e.arrival || journey.transfers < e.transfers)
        ),
    );

    // Check if new journey is Pareto-optimal
    if (!isParetoOptimal(journey, existing)) {
      return false;
    }

    existing.push(journey);

    // Limit journey explosion - keep best journeys
    if (existing.length > MAX_JOURNEYS_PER_STOP) {
      existing.sort(
        (a, b) =>
          a.arrival +
          a.transfers * 15 +
          a.originWalkDistance -
          (b.arrival + b.transfers * 15 + b.originWalkDistance),
      );
      existing = existing.slice(0, MAX_JOURNEYS_PER_STOP);
    }

    paretoJourneys.set(stopId, existing);
    return true;
  }

  // Apply initial transfers from origin

  // Early termination tracking
  const destStopSet = new Set(destinationStops.map((d) => d.stopId));
  let bestDestArrival = Infinity;

  // Main CSA loop - optimized
  for (let i = startIndex; i < allConnections.length; i++) {
    const conn = allConnections[i];

    // Time window check
    if (conn.departure > windowStart + 300) break;

    // Early termination if we have good routes
    if (bestDestArrival !== Infinity && conn.departure > bestDestArrival + 60) {
      break;
    }

    // ========== OPTIMIZED WALKING TRANSFERS ==========
    // Use pre-built index instead of iterating all stops
    const incomingTransfers = transfersToIndex.get(conn.fromStop) || [];

    for (const { from: sourceStopId, transfer } of incomingTransfers) {
      const journeys = paretoJourneys.get(sourceStopId);
      if (!journeys) continue;

      for (const sourceJourney of journeys) {
        const arrivalAfterWalk = sourceJourney.arrival + transfer.transferTime;

        // Can we walk there in time to catch the bus?
        if (arrivalAfterWalk > conn.departure) continue;

        const isTransfer =
          sourceJourney.routeId !== null &&
          sourceJourney.routeId !== conn.routeId;
        const newTransfers =
          sourceJourney.transfers +
          (transfer.type === "inter-group" ? 1 : 0) +
          (isTransfer ? 1 : 0);

        if (newTransfers > maxTransfers) continue;

        const walkJourney: Journey = {
          id: journeyIdCounter++,
          arrival: arrivalAfterWalk,
          prevStop: sourceStopId,
          prevConn: {
            type: "transfer",
            transferTime: transfer.transferTime,
            groupName: transfer.groupName,
            transferType: transfer.type,
          },
          prevJourneyId: sourceJourney.id,
          routeId: null,
          transfers:
            sourceJourney.transfers + (transfer.type === "inter-group" ? 1 : 0),
          departureTime: sourceJourney.departureTime,
          originStopId: sourceJourney.originStopId,
          originWalkTime: sourceJourney.originWalkTime,
          originWalkDistance: sourceJourney.originWalkDistance,
        };

        if (addParetoJourney(conn.fromStop, walkJourney)) {
          const allJ = allJourneys.get(conn.fromStop) || [];
          allJ.push(walkJourney);
          allJourneys.set(conn.fromStop, allJ);
        }
      }
    }

    // ========== PROCESS JOURNEYS AT FROM STOP ==========
    const fromJourneys = paretoJourneys.get(conn.fromStop) || [];

    for (const fromJourney of fromJourneys) {
      if (fromJourney.arrival > conn.departure) continue;

      const isTransfer =
        fromJourney.routeId !== null && fromJourney.routeId !== conn.routeId;
      const newTransfers = isTransfer
        ? fromJourney.transfers + 1
        : fromJourney.transfers;

      if (newTransfers > maxTransfers) continue;

      const newJourney: Journey = {
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

      if (addParetoJourney(conn.toStop, newJourney)) {
        const allJ = allJourneys.get(conn.toStop) || [];
        allJ.push(newJourney);
        allJourneys.set(conn.toStop, allJ);

        // Apply transfers from this stop
        const counterRef = { val: journeyIdCounter };
        applyTransfers(
          conn.toStop,
          conn.arrival,
          conn.routeId,
          newTransfers,
          connections,
          paretoJourneys,
          allJourneys,
          counterRef,
          {
            stopId: fromJourney.originStopId ?? 0,
            walkTime: fromJourney.originWalkTime ?? 0,
            distance: fromJourney.originWalkDistance,
          },
        );
        journeyIdCounter = counterRef.val;

        // Track best arrival at destinations for early termination
        if (destStopSet.has(conn.toStop)) {
          bestDestArrival = Math.min(bestDestArrival, conn.arrival);
        }
      }
    }
  }

  // Reconstruct routes for all destination stops
  const destStopMap = new Map(destinationStops.map((d) => [d.stopId, d]));

  for (const dest of destinationStops) {
    const journeysToStop = allJourneys.get(dest.stopId) || [];
    for (const journey of journeysToStop) {
      const route = reconstructRouteFromJourney(
        journey,
        allJourneys,
        destStopMap,
      );
      if (route) {
        foundRoutes.push(route);
      }
    }
  }

  return foundRoutes;
}

/**
 * Updated connectionScanAllDay to use optimized version
 */
function connectionScanAllDayOptimized(
  originStops: IStop[],
  destinationStops: IStop[],
  connections: Map<number, Connections>,
  stopsByGroup: Map<number, number[]>,
  startTime: number = 972,
  endTime: number = 1100,
) {
  const maxTransfers = 5;

  // Initialize connections if needed
  if (cachedSortedConnections.length === 0) {
    initializeRouter(connections, stopsByGroup);
  }

  // BUILD REVERSE TRANSFER INDEX ONCE
  const transfersToIndex = buildReverseTransferIndex(connections);

  const fullSchedule = cachedSortedConnections;
  let globalStartIndex = binarySearchStartIndex(fullSchedule, startTime);

  const SCAN_WINDOW = 10;
  const allRoutes: IRoute[] = [];

  // Sort origin stops by walk time
  const sortedOrigins = [...originStops].sort(
    (a, b) => a.walkTime - b.walkTime,
  );

  // Scan windows for each origin
  for (const origin of sortedOrigins) {
    for (let time = startTime; time < endTime; time += SCAN_WINDOW) {
      const windowStart = time;

      let windowStartIndex = binarySearchStartIndex(
        fullSchedule,
        windowStart,
        globalStartIndex,
      );

      // USE OPTIMIZED VERSION
      const windowRoutes = scanWindowOptimized(
        origin,
        destinationStops,
        fullSchedule,
        connections,
        maxTransfers,
        windowStart,
        windowStartIndex,
        transfersToIndex, // Pass pre-built index
      );

      allRoutes.push(...(windowRoutes as IRoute[]));
    }
  }

  return filterAndDeduplicateRoutes(allRoutes);
}

/**
 * Apply transfers (options) for continuing the journey
 */
function applyTransfers(
  stopId: number,
  arrivalTime: number,
  routeId: number | null,
  transfers: number,
  connections: Map<number, Connections>,
  paretoJourneys: { [stopId: number]: Journey[] },
  allJourneys: { [stopId: number]: Journey[] },
  journeyIdCounter: { val: number },
  originData: { stopId: number; walkTime: number; distance: number },
) {
  const stopConn = connections.get(stopId);
  if (!stopConn || !stopConn.transfers) return;

  // Helper function to check if a journey is Pareto-dominated
  function isParetoOptimal(
    newJourney: Journey,
    existingJourneys: Journey[],
  ): boolean {
    if (!existingJourneys || existingJourneys.length === 0) return true;

    for (const existing of existingJourneys) {
      if (
        existing.arrival <= newJourney.arrival &&
        existing.transfers <= newJourney.transfers
      ) {
        if (
          existing.arrival < newJourney.arrival ||
          existing.transfers < newJourney.transfers
        ) {
          return false;
        }
      }
    }
    return true;
  }

  function addParetoJourney(stopId: number, journey: Journey) {
    if (!paretoJourneys[stopId]) {
      paretoJourneys[stopId] = [];
    }

    paretoJourneys[stopId] = paretoJourneys[stopId].filter((existing) => {
      return !(
        journey.arrival <= existing.arrival &&
        journey.transfers <= existing.transfers &&
        (journey.arrival < existing.arrival ||
          journey.transfers < existing.transfers)
      );
    });

    if (isParetoOptimal(journey, paretoJourneys[stopId])) {
      paretoJourneys[stopId].push(journey);
      return true;
    }
    return false;
  }

  const MAX_TRANSFER_DEPTH = 10;

  // Find the specific journey we're transferring from
  let baseJourney = null;
  const journeysAtStop = paretoJourneys[stopId] || [];
  for (const j of journeysAtStop) {
    if (
      j.arrival === arrivalTime &&
      j.transfers === transfers &&
      j.routeId === routeId
    ) {
      baseJourney = j;
      break;
    }
  }

  if (!baseJourney) return; // Can't find the journey to transfer from

  const queue = [
    {
      stopId,
      arrivalTime,
      routeId,
      transfers,
      depth: 0,
      parentJourneyId: baseJourney.id,
    },
  ];

  // IMPROVED: Track visited stops at each depth to prevent cycles
  const visited = new Map<number, Set<string>>(); // depth -> set of "stopId-arrival-transfers"

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;

    const {
      stopId: currentStop,
      arrivalTime: currentTime,
      transfers: currentTransfers,
      depth,
      parentJourneyId,
    } = next;

    if (depth >= MAX_TRANSFER_DEPTH) continue;

    // IMPROVED: Check if we've visited this state at this depth
    if (!visited.has(depth)) {
      visited.set(depth, new Set());
    }
    const depthVisited = visited.get(depth)!;
    const visitKey = `${currentStop}-${currentTime}-${currentTransfers}`;
    if (depthVisited.has(visitKey)) continue;
    depthVisited.add(visitKey);

    const currentConn = connections.get(currentStop);
    if (!currentConn || !currentConn.transfers) continue;

    for (const transfer of currentConn.transfers) {
      const newTransfers =
        currentTransfers + (transfer.type === "inter-group" ? 1 : 0);
      const transferArrival = currentTime + transfer.transferTime;

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
        prevJourneyId: parentJourneyId,
        routeId: null,
        transfers: newTransfers,
        departureTime: originData.stopId,
        originStopId: originData.stopId,
        originWalkTime: originData.walkTime,
        originWalkDistance: originData.distance,
      };

      const existingJourneys = paretoJourneys[transfer.to] || [];

      // IMPORTANT: Only add and continue if it's actually Pareto-optimal
      const wasAdded = addParetoJourney(transfer.to, journeyEntry);

      if (wasAdded) {
        if (!allJourneys[transfer.to]) {
          allJourneys[transfer.to] = [];
        }
        allJourneys[transfer.to].push(journeyEntry);

        // IMPROVED: Only continue if we haven't reached max depth and the transfer is meaningful
        if (depth + 1 < MAX_TRANSFER_DEPTH && transfer.transferTime < 15) {
          queue.push({
            stopId: transfer.to,
            arrivalTime: transferArrival,
            routeId: null,
            transfers: newTransfers,
            depth: depth + 1,
            parentJourneyId: journeyEntry.id,
          });
        }
      }
    }
  }
}

/**
 * Create the journey
 */
function reconstructRouteFromJourney(
  destJourney: Journey,
  allJourneys: Map<number, Journey[]>, // NOW A MAP
  destStopMap: Map<number, IStop>,
) {
  const pathSegments: ITransitSegment[] = [];
  let currentJourney = destJourney;
  const path = [];

  // backtrack the journey from end to start
  while (currentJourney !== null) {
    path.unshift({
      stop: currentJourney.prevStop,
      arrival: currentJourney.arrival,
      conn: currentJourney.prevConn,
      routeId: currentJourney.routeId,
    });

    // end of journey found
    if (currentJourney.prevJourneyId === null) break;

    // moving to next segment
    const prevStop = currentJourney.prevStop;
    if (typeof prevStop === "number") {
      const journeysAtPrev = allJourneys.get(prevStop) || []; // USE .get() FOR MAP
      const foundJourney = journeysAtPrev.find(
        (j) => j.id === currentJourney.prevJourneyId,
      );

      if (!foundJourney) {
        console.error("Journey reconstruction failed:", {
          currentJourneyId: currentJourney.id,
          prevJourneyId: currentJourney.prevJourneyId,
          prevStop,
          availableJourneys: journeysAtPrev.map((j) => j.id),
        });
        throw new Error(
          `Previous journey not found: ID ${currentJourney.prevJourneyId} at stop ${prevStop}`,
        );
      }
      currentJourney = foundJourney;
    } else {
      break;
    }
  }

  // creating output segments from found journey parts
  let i = 1;
  while (i < path.length) {
    const conn = path[i]?.conn;
    if (!conn) {
      i++;
      continue;
    }

    const legStart = i;
    const routeId = path[i].routeId ?? 0;

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
        duration: 0,
      });
    }

    i = legEnd + 1;
  }

  const transitSegments = pathSegments.filter((s) => s.type === "transit");
  if (transitSegments.length === 0) return null;

  const finalStopId = transitSegments[transitSegments.length - 1].to;
  const destInfo = destStopMap.get(finalStopId);
  if (!destInfo) return null;

  // result
  return {
    originStop: destJourney.originStopId,
    destStop: finalStopId,
    initialWalk: destJourney.originWalkTime,
    initialWalkDistance: destJourney.originWalkDistance,
    key: transitSegments.map((leg) => leg.key).join("-"),
    finalWalk: destInfo.walkTime,
    finalWalkDistance: destInfo.distance,
    departure: transitSegments[0].departure - (destJourney.originWalkTime ?? 0),
    arrival: transitSegments[transitSegments.length - 1].arrival,
    actualDeparture: transitSegments[0].departure,
    transfers: transitSegments.length - 1,
    pathSegments,
  };
}
const SCORING_CONFIG = {
  WALK_RELUCTANCE: 2.5,
  WAIT_RELUCTANCE: 1.5,

  TRANSFER_FIXED_PENALTY: 25,

  RISK_THRESHOLD_MIN: 4,
  RISK_EXPONENT_FACTOR: 30,

  WALK_THRESHOLD_SOFT: 5,
  WALK_PENALTY_HARD: 1.5,
};

/**
 * Filter out objectively bad routes
 */
function filterAndDeduplicateRoutes(routes: IRoute[]) {
  if (!routes.length) return [];
  return routes;
  const scoredRoutes = routes.map((route) => ({
    route,
    score: calculateRouteScore(route),
  }));

  scoredRoutes.sort((a, b) => a.score - b.score);
  const bestScore = scoredRoutes[0].score;

  // filter out bad scores
  const filteredRoutes = scoredRoutes.filter(
    (route) => route.score <= bestScore * 1.5,
  );

  // deduplication algorithm
  const seenKeys = new Set();
  const seenDepartures = new Set();
  const seenArrivals = new Set();
  const seenLegs = new Set();
  const result = [];

  for (const { route } of filteredRoutes) {
    if (seenKeys.has(route.key)) continue;
    if (seenDepartures.has(route.actualDeparture)) continue;
    if (seenArrivals.has(route.arrival)) continue;
    if (route.pathSegments.some((p) => seenLegs.has(p.key))) continue;
    route.pathSegments.map((p) => p.key).forEach((key) => seenLegs.add(key));
    seenArrivals.add(route.arrival);
    seenKeys.add(route.key);
    seenDepartures.add(route.actualDeparture);
    result.push(route);
  }

  return result;
}

/**
 * Calculate how good a route is
 */
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

/**
 * Build journey segments for display
 */
async function buildJourneyDetails(
  route: IRoute,
  stopInfo: Map<number, Stop>,
  stopsByGroup: Map<number, number[]>,
  depRoutes: DepartureRoute[],
  fullRoutesByRoute: Map<number, FullRoute[]>,
  additionalByDep: Map<number, Set<number>>,
  routeGeometryByDep: Map<number, IRouteGeometry[]>,
) {
  const segments = [];

  // initial walk segment
  if (route.initialWalk > 0) {
    segments.push({
      type: "walk",
      from: "origin",
      to: route.originStop,
      fromName: "Origin coordinates",
      toName: getStopName(route.originStop, stopInfo),
      duration: route.initialWalk,
      distance: route.initialWalkDistance,
    });
  }

  // transfer / transit segments
  for (const pathSeg of route.pathSegments || []) {
    if (pathSeg.type === "transfer") {
      // transfer to a diffrent stop group
      const fromInfo = stopInfo.get(pathSeg.from);
      const toInfo = stopInfo.get(pathSeg.to);
      const distance =
        fromInfo && toInfo
          ? getPreciseDistance(
              { latitude: fromInfo.lat, longitude: fromInfo.lon },
              { latitude: toInfo.lat, longitude: toInfo.lon },
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
    } else if (pathSeg.type === "transit") {
      segments.push(
        await populateRoutes(
          {
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
          },
          stopInfo,
          depRoutes,
          fullRoutesByRoute,
          additionalByDep,
          routeGeometryByDep,
        ),
      );
    }
  }

  // final walk segment
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
export function getStopName(stopId: number, stopInfo: Map<number, Stop>) {
  const info = stopInfo.get(stopId);
  return info?.alias || info?.groupName || `Stop ${stopId}`;
}

export function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function binarySearchStartIndex(
  schedule: Connection[],
  targetTime: number,
  startFrom: number = 0,
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

async function findNearbyStops(
  lat: number,
  lon: number,
  stopInfo: Map<number, Stop>,
) {
  const nearbyStops = [];
  for (const [stopId, info] of stopInfo) {
    const distance = getPreciseDistance(
      { latitude: lon, longitude: lat },
      { latitude: info.lon, longitude: info.lat },
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
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lon},${lat}&destinations=${destinations}&mode=walking&units=metric&key=${process.env.GOOGLE_KEY}`,
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

export default {
  csaCoordinateRouting,
  findNearbyStops,
  initializeRouter,
};
