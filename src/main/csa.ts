import { getPreciseDistance } from "geolib";

const WALK_SPEED = 80; // meters per minute
import { Connection, IStop, Journey, StopToGroupMap } from "../models/models";
import { Connections, Stop } from "../models/preprocessModels";
const TRANSFER_PENALTY = 25; // minutes penalty for each transfer (increased)
const WALK_PENALTY_MULTIPLIER = 8; // strongly penalize walking (2x priority vs transfers)
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

      if (
        element.status === "OK" &&
        element.distance.value < MAX_WALK_DISTANCE
      ) {
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
  journeyMap: { [stopId: number]: Journey }
) {
  const stopConn = connections.get(stopId);
  if (!stopConn || !stopConn.transfers) return;

  const MAX_TRANSFER_DEPTH = 100; // Limit how deep we search
  if (!stopId || !arrivalTime || !routeId || !transfers) return;
  const queue: {
    stopId: number;
    arrivalTime: number;
    routeId: number | null;
    transfers: number;
    depth: number;
  }[] = [{ stopId, arrivalTime, routeId, transfers, depth: 0 }];
  const processed = new Set();

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;

    const {
      stopId: currentStop,
      arrivalTime: currentTime,
      routeId: currentRoute,
      transfers: currentTransfers,
      depth,
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

      if (currentReach === undefined || transferArrival < currentReach) {
        reachable[transfer.to] = transferArrival;

        const journeyEntry = {
          arrival: transferArrival,
          prevStop: currentStop,
          prevConn: {
            type: "transfer",
            transferTime: transfer.transferTime,
            groupName: transfer.groupName,
            transferType: transfer.type,
          },
          routeId: currentRoute,
          transfers: newTransfers,
        };

        journeyMap[transfer.to] = journeyEntry;

        if (depth + 1 < MAX_TRANSFER_DEPTH) {
          queue.push({
            stopId: transfer.to,
            arrivalTime: transferArrival,
            routeId: currentRoute,
            transfers: newTransfers,
            depth: depth + 1,
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

  const routes = connectionScanAllDay(
    originStops,
    destStops,
    connections,
    stopInfo,
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
      departureMinutes:
        route.actualDeparture - route.initialWalk + route.finalWalk,
      arrivalMinutes: route.arrival,
      key: route.key,
      duration:
        route.arrival -
        (route.actualDeparture - route.initialWalk - route.finalWalk),
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
                route.initialWalkDistance || route.initial * WALK_SPEED
              )}m)`
            : "None",
        finalWalk:
          route.finalWalk > 0
            ? `${route.finalWalk}min (${Math.round(
                route.finalWalkDistance || route.finalWalk * WALK_SPEED
              )}m)`
            : "None",
      },
    };
  });

  return {
    success: true,
    routes: formattedRoutes.sort(
      (a, b) => a.departureMinutes - b.departureMinutes
    ),
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
  stopInfo: Map<number, Stop>,
  stopsByGroup: Map<number, number[]>
) {
  const maxTransfers = 5;
  const startTime = 500;
  const endTime = 1000;

  if (cachedSortedConnections.length == 0) {
    console.log("haja");
    initializeRouter(connections, stopsByGroup);
  }

  const fullSchedule = cachedSortedConnections; // Binary search for start index (faster than linear search)
  let globalStartIndex = binarySearchStartIndex(fullSchedule, startTime);

  const SCAN_WINDOW = 30;
  const allRoutes = [];
  const TARGET_ROUTES = 100; // Stop early when we have enough good routes // Sort origins by walking distance (closest first)

  const sortedOrigins = [...originStops].sort(
    (a, b) => a.walkTime - b.walkTime
  );

  for (const origin of sortedOrigins) {
    // Early exit if we have enough routes
    if (allRoutes.length >= TARGET_ROUTES * 5) break;

    for (let time = startTime; time < endTime; time += SCAN_WINDOW) {
      const windowStart = time; // Use binary search instead of linear

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

      allRoutes.push(...windowRoutes); // Early termination

      if (allRoutes.length >= TARGET_ROUTES * 4) {
        return filterAndDeduplicateRoutes(allRoutes);
      }
    }
  }
  return filterAndDeduplicateRoutes(allRoutes);
}

// Binary search helper
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
  const MAX_ROUTES_PER_WINDOW = 25; // Limit routes per window // Use objects for better performance

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
  };

  journeyMap[origin.stopId] = originJourney;
  allJourneys[origin.stopId] = [originJourney]; // Only apply transfers if needed

  applyTransfers(
    origin.stopId,
    originTime,
    null,
    0,
    connections,
    reachable,
    journeyMap
  ); // Create destination lookup for fast checking

  const destStopSet = new Set(destinationStops.map((d) => d.stopId));
  let destReachedCount = 0; // Main connection scan with early termination
  for (let i = startIndex; i < allConnections.length; i++) {
    const conn = allConnections[i]; // Stop scanning if we're too far past the window
    if (conn.departure > windowStart + 360) break; // 4 hours max
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
    };

    if (currentReach === undefined || conn.arrival < currentReach) {
      reachable[conn.toStop] = conn.arrival;
      journeyMap[conn.toStop] = newJourney;
    }

    if (!allJourneys[conn.toStop]) {
      allJourneys[conn.toStop] = [];
    }
    allJourneys[conn.toStop].push(newJourney); // Check if we reached a destination

    if (destStopSet.has(conn.toStop)) {
      destReachedCount++; // Early exit if we've reached destinations enough times
      if (destReachedCount > 200) break;
    } // Only apply transfers if we haven't hit transfer limit

    if (newTransfers < maxTransfers) {
      applyTransfers(
        conn.toStop,
        conn.arrival,
        conn.routeId,
        newTransfers,
        connections,
        reachable,
        journeyMap
      );
    }
  }

  for (const dest of destinationStops) {
    if (foundRoutes.length >= MAX_ROUTES_PER_WINDOW) break;
    if (!reachable[dest.stopId]) continue;

    const journeysToStop = allJourneys[dest.stopId] || []; // Just reconstruct all journeys and let filterAndDeduplicateRoutes handle it
    for (const journey of journeysToStop) {
      const route = reconstructRouteFromJourney(
        journey,
        allJourneys,
        origin,
        destinationStops
      );
      if (route) {
        foundRoutes.push(route); // Remove the per-window limit or increase it significantly
      }
    }
  }

  return foundRoutes;
}
export function initializeRouter(
  connections: Map<number, Connections>,
  stopsByGroup: Map<number, number[]>
) {
  let cachedStopToGroupMap: StopToGroupMap = new Map();
  for (const [groupId, stopIds] of stopsByGroup) {
    for (const stopId of stopIds) {
      cachedStopToGroupMap.set(stopId, groupId);
    }
  }
  console.log(connections.get(4));
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

// Updated reconstructRouteFromJourney to work with objects
function reconstructRouteFromJourney(
  destJourney: Journey,
  allJourneys: Journey[],
  origin: IStop,
  destStops: IStop[]
) {
  const legs = [];
  let currentJourney = destJourney;

  const path = [];
  while (currentJourney !== null) {
    path.unshift({
      stop:
        currentJourney.prevStop !== null
          ? currentJourney.prevStop
          : origin.stopId,
      arrival: currentJourney.arrival,
      conn: currentJourney.prevConn,
      routeId: currentJourney.routeId,
    });

    if (currentJourney.prevJourneyId === null) break;

    const prevStop = currentJourney.prevStop; // Handle both object and Map
    const journeysAtPrev = allJourneys[prevStop] || [];
    currentJourney = journeysAtPrev.find(
      (j) => j.id === currentJourney.prevJourneyId
    );

    if (!currentJourney) break;
  }

  let i = 1;
  while (i < path.length) {
    const conn = path[i]?.conn;

    if (conn && conn.type === "transfer") {
      i++;

      continue;
    }

    const legStart = i;
    const routeId = path[i].routeId;

    let legEnd = i;
    while (legEnd + 1 < path.length) {
      const nextConn = path[legEnd + 1].conn;
      if (!nextConn || nextConn.type === "transfer") {
        legEnd++;
        continue;
      }
      if (path[legEnd + 1].routeId !== routeId) {
        break;
      }
      legEnd++;
    }

    const firstConn = path[legStart].conn;
    const lastConn = path[legEnd].conn;
    const lastArrival = path[legEnd].arrival;
    if (
      !firstConn ||
      !lastConn ||
      !(firstConn instanceof Connection) ||
      !(lastConn instanceof Connection)
    )
      continue;
    legs.push({
      type: "transit",
      from: firstConn.fromStop,
      to: lastConn.toStop,
      departure: firstConn.departure,
      arrival: lastArrival,
      routeId,
      key: firstConn.key,
      line: firstConn.lineName,
      lineType: firstConn.lineType,
      lineColor: firstConn.lineColor,
      signature: firstConn.signature,
    });

    i = legEnd + 1;
  }

  if (legs.length === 0) return null;

  const boardingStop = legs[0].from;
  if (boardingStop !== origin.stopId) {
    return null;
  } // Create destination lookup map

  const destStopMap = new Map();
  for (const dest of destStops) {
    destStopMap.set(dest.stopId, dest);
  }

  const finalStopId = legs[legs.length - 1].to;
  const destInfo = destStopMap.get(finalStopId);

  return {
    originStop: boardingStop,
    destStop: finalStopId,
    initialWalk: destJourney.originWalkTime,
    initialWalkDistance: origin.distance || null,
    key: legs.map((leg) => leg.key).join("-"),
    finalWalk: destInfo ? destInfo.walkTime : 0,
    finalWalkDistance: destInfo ? destInfo.distance : null,
    departure: legs[0].departure - origin.walkTime,
    arrival: legs[legs.length - 1].arrival,
    actualDeparture: legs[0].departure,
    transfers: legs.length - 1,
    legs,
  };
}
/**
 * Calculate weighted score for a route
 */
function calculateRouteScore(route) {
  const totalWalk = route.initialWalk + route.finalWalk;
  const totalTime = route.arrival - route.actualDeparture;
  let score =
    totalTime +
    route.transfers * TRANSFER_PENALTY +
    totalWalk * WALK_PENALTY_MULTIPLIER;

  if (route.transfers > 0 || totalWalk > 10) {
    score += route.transfers * 10;
  }

  return score;
}

function filterAndDeduplicateRoutes(routes) {
  if (!routes.length) return [];
  const scoredRoutes = routes.map((route) => ({
    route,
    score: calculateRouteScore(route),
  }));

  scoredRoutes.sort((a, b) => a.score - b.score);

  const seenKeys = new Set();
  const seenDepartures = new Set();
  const seenArrivals = new Set();
  const seenFirstLeg = new Set();
  const result = [];

  for (const { route } of scoredRoutes) {
    if (seenKeys.has(route.key)) continue;
    if (seenDepartures.has(route.actualDeparture)) continue;
    if (seenArrivals.has(route.arrival)) continue;
    if (seenFirstLeg.has(route.legs[0].key)) continue;
    seenFirstLeg.add(route.legs[0].key);
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
function buildJourneyDetails(route, stopInfo) {
  const segments = [];

  if (route.initialWalk > 0) {
    segments.push({
      type: "walk",
      from: "origin",
      to: route.originStop,
      fromName: "Origin coordinates",
      toName: getStopName(route.originStop, stopInfo),
      duration: route.initialWalk,
      distance: route.initialWalk * WALK_SPEED,
    });
  }

  for (const leg of route.legs) {
    segments.push({
      type: "transit",
      from: leg.from,
      to: leg.to,
      fromName: getStopName(leg.from, stopInfo),
      toName: getStopName(leg.to, stopInfo),
      departure: leg.departure,
      arrival: leg.arrival,
      duration: leg.arrival - leg.departure,
      line: leg.line,
      key: leg.key,
      routeId: leg.routeId,
      signature: leg.signature,
      lineColor: leg.lineColor,
      lineType: leg.lineType,
    });
  }

  if (route.finalWalk > 0) {
    segments.push({
      type: "walk",
      from: route.destStop,
      to: "destination",
      fromName: getStopName(route.destStop, stopInfo),
      toName: "Destination coordinates",
      duration: route.finalWalk,
      distance: route.finalWalk * WALK_SPEED,
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

export default {
  csaCoordinateRouting,
  findNearbyStops,
  initializeRouter,
};
