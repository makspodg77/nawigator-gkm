export interface TreeItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  stopId: number;
  lat: number;
  lon: number;
}

export class Stop {
  public id: number;
  public groupId: number;
  public lat: number;
  public lon: number;

  constructor(
    id: string,
    groupId: string,
    coords: string,
    public street: string,
    public alias: string,
    public groupName: string,
  ) {
    this.id = Number(id);
    this.groupId = Number(groupId);
    const [lat, lon] = coords.split(",").map(Number);
    this.lat = lat;
    this.lon = lon;
  }
}

export class StopGroup {
  public id: number;
  constructor(
    id: string,
    public name: string,
  ) {
    this.id = Number(id);
  }
}

export class Line {
  public id: number;
  public lineTypeId: number;
  constructor(
    id: string,
    public name: string,
    lineTypeId: string,
  ) {
    this.id = Number(id);
    this.lineTypeId = Number(lineTypeId);
  }
}

export class LineType {
  public id: number;
  constructor(
    id: string,
    public nameSingular: string,
    public namePlural: string,
    public color: string,
  ) {
    this.id = Number(id);
  }
}

export class Route {
  public id: number;
  public lineId: number;
  constructor(
    id: string,
    lineId: string,
    public isCircular: boolean,
    public isNight: boolean,
  ) {
    this.id = Number(id);
    this.lineId = Number(lineId);
  }
}

export class DepartureRoute {
  public id: number;
  public routeId: number;
  constructor(
    id: string,
    public signature: string,
    public color: string,
    routeId: string,
  ) {
    this.id = Number(id);
    this.routeId = Number(routeId);
  }
}

export class FullRoute {
  public id: number;
  public stopId: number;
  public travelTime: number;
  public stopNumber: number;
  public routeId: number;

  constructor(
    id: string,
    stopId: string,
    travelTime: string,
    public isOnRequest: boolean,
    stopNumber: string,
    routeId: string,
    public isFirst: boolean,
    public isLast: boolean,
    public isOptional: boolean,
  ) {
    this.id = Number(id);
    this.stopId = Number(stopId);
    this.travelTime = Number(travelTime);
    this.stopNumber = Number(stopNumber);
    this.routeId = Number(routeId);
  }
}

export interface IRouteGeometry {
  id: number;
  lat: number;
  lon: number;
  departureRouteId: number;
  stopNumber: number;
}

export class Timetable {
  public id: number;
  public routeId: number;
  public departureTime: number;

  constructor(id: string, routeId: string, departureTime: string) {
    this.id = Number(id);
    this.routeId = Number(routeId);
    const [h, m] = departureTime.split(":").map(Number);
    this.departureTime = h * 60 + m; // Convert "14:30" to 870
  }
}

export class AdditionalStop {
  public routeId: number;
  public stopNumber: number;
  constructor(routeId: string, stopNumber: string) {
    this.routeId = Number(routeId);
    this.stopNumber = Number(stopNumber);
  }
}

export interface RideConnection {
  from: number;
  to: number;
  travelTime: number;
  departures: { time: number; key: string }[];
  isOnRequest: boolean;
  lineName: string;
  direction: number;
  lineType: string;
  lineColor: string;
  signature: string;
  isNight: boolean;
  depRouteId: number;
  routeId: number;
}

export interface TransferConnection {
  to: number;
  transferTime: number;
  distance?: number;
  groupId: number;
  groupName: string;
  type: string;
}

export interface Connections {
  rides: RideConnection[];
  transfers: TransferConnection[];
}
