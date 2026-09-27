export type SpatialVoronoiSite<T extends Record<string, unknown> = Record<string, unknown>> = {
  lng: number;
  lat: number;
  properties: T;
};
