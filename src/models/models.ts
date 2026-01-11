export class Connection {
  constructor(
    public fromStop: number,
    public toStop: number,
    public departure: number,
    public key: string,
    public groupId: number,
    public arrival: number,
    public routeId: number,
    public lineName: string,
    public lineType: string,
    public lineColor: string,
    public signature: string,
    public transfers: number = 0,
    public type: string = "transfer"
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
}

export interface IPrevConn {
  type: string; // "transfer" or "walk"
  transferTime: number;
  groupName: string;
  transferType: string; // "intra-group" or "inter-group"
}
