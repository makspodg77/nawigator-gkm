export class Connection {
  constructor(
    public fromStop: number,
    public toStop: number,
    public departure: number,
    public key: string,
    public groupId: number,
    public arrival: number,
    public direction: number,
    public routeId: number,
    public lineName: string,
    public lineType: string,
    public lineColor: string,
    public signature: string,
    public transfers: number = 0,
    public type: string = "transit",
  ) {}
}

export interface IStop {
  stopId: number;
  distance: number;
  walkTime: number;
  stopInfo: {
    lat: number;
    lon: number;
    groupId: number;
    groupName: string;
    street: string;
    alias: string;
  };
}

export type StopToGroupMap = Map<number, number>;

export interface Journey {
  id?: number;
  arrival: number;
  prevStop: number | null;
  prevConn?: Connection | IPrevConn | null;
  prevJourneyId?: number | null;
  routeId: number | null;
  transfers: number;
  departureTime?: number;
  originStopId?: number;
  originWalkTime?: number;
  originWalkDistance: number;
}

export interface IPrevConn {
  type: string; // "transfer" or "walk"
  transferTime: number;
  groupName: string;
  transferType: string; // "intra-group" or "inter-group"
}

interface ISegment {
  type: string;
  from: number;
  to: number;
  duration: number;
}

export interface ITransitSegment extends ISegment {
  departure: number;
  arrival: number;
  routeId: number;
  key: string;
  direction: number;
  line: string;
  lineType: string;
  lineColor: string;
  signature: string;
}

export interface IPreFinalSegment extends ITransitSegment {
  fromName: string;
  toName: string;
  directionName: string;
}

export interface IFinalSegment extends ITransitSegment {
  stopsInBetween: { departureTime: string; name: string }[];
  coords: { lat: number; lon: number }[];
}

export interface ITransferSegment extends ISegment {
  transferType: string;
}

export interface IRoute {
  originStop: number;
  destStop: number;
  initialWalk: number;
  initialWalkDistance: number;
  key: string;
  direction: number;
  finalWalk: number;
  finalWalkDistance: number;
  departure: number;
  actualDeparture: number;
  arrival: number;
  transfers: number;
  pathSegments: ITransitSegment[];
}
