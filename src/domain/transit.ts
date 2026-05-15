import type { LatLngTuple } from "./geometry";

export type TransitRouteMode =
  | "rail"
  | "metro"
  | "tram"
  | "bus"
  | "ferry"
  | "other";

export type TransitRouteFilter = "all" | TransitRouteMode;

export interface TransitBoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface TransitMetro {
  id: string;
  label: string;
  center: LatLngTuple;
  radiusKm: number;
  transitlandFeed?: string;
  transitlandRtFeed?: string;
  gtfsRtVehicleUrl?: string;
}

export interface TransitStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  mode: TransitRouteMode;
}

export interface TransitRouteLine {
  id: string;
  name: string;
  mode: TransitRouteMode;
  ref?: string;
  positions: LatLngTuple[];
}

export interface TransitVehicle {
  id: string;
  label: string;
  lat: number;
  lng: number;
  bearing?: number;
  routeRef?: string;
  mode: TransitRouteMode;
  updatedAt: string;
}

export interface TransitStaticData {
  stops: TransitStop[];
  routes: TransitRouteLine[];
  fetchedAt: string;
}

export interface TransitRealtimeSnapshot {
  vehicles: TransitVehicle[];
  fetchedAt: string;
  source: "proxy" | "transitland" | "none";
  message?: string;
}
