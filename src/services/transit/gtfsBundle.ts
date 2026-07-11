import type { TransitRouteMode } from "../../domain/map/transit";

export interface GtfsBundleStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  parentStationId?: string;
}

export interface GtfsBundleRoute {
  id: string;
  shortName: string;
  longName: string;
  mode: TransitRouteMode;
}

export interface GtfsStaticBundle {
  metroId: string;
  feedOnestopId: string;
  builtAt: string;
  stops: GtfsBundleStop[];
  routes: GtfsBundleRoute[];
  /** stop id -> route ids serving that stop */
  stopRouteIds: Record<string, string[]>;
}

export const GTFS_BUNDLE_MANIFEST_PATH = "/geo/gtfs/manifest.json";

export interface GtfsBundleManifest {
  metros: Array<{
    id: string;
    bundlePath: string;
    feedOnestopId: string;
    builtAt: string;
    stopCount: number;
    routeCount: number;
  }>;
}
