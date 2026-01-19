import { createContext, useContext } from "react";

type WalkSegment = {
  type: "walk";
  from: string | number;
  to: string | number;
  fromName: string;
  toName: string;
  duration: number;
  distance: number;
};

type TransitSegment = {
  type: "transit";
  from: number;
  to: number;
  fromName: string;
  toName: string;
  departure: number;
  direction: number;
  directionName: string;
  arrival: number;
  duration: number;
  line: string;
  routeId: number;
  signature: string;
  lineColor: string;
  lineType: string;
  formattedDeparture: string;
  formattedArrival: string;
  stopsBetween: {
    stopId: number;
    departureTime: number;
    departureTimeFormatted: string;
    name: string;
  }[];
  geometryPoints: { lat: number; lon: number }[];
};

export type Route = {
  id: number;
  departure: string;
  arrival: string;
  departureMinutes: number;
  arrivalMinutes: number;
  key: string;
  duration: string;
  transfers: number;
  weightedScore: number;
  segments: [WalkSegment, ...TransitSegment[], WalkSegment];
};

export const RoutesContext = createContext<Route[] | null>(null);

export function useRoutes() {
  const ctx = useContext(RoutesContext);
  if (!ctx) {
    throw new Error("useStops must be used inside StopsContext.Provider");
  }
  return ctx;
}
