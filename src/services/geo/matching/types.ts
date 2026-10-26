import type { MatchingFeature } from "@/domain/geo/types";
import type { LatLngTuple } from "@/domain/geometry/kernel/types";
import type { TransitRouteFilter } from "@/domain/map/transit";
import type { RegionPackId } from "@/domain/regions/regionPack";
import type {
  CustomMatchingAreasByLevel,
  SessionCustomCategory,
} from "@/domain/session/catalog/sessionCustomContent";
import type { PackThenOverpassProgress } from "../overpass/overpassLoad";

export interface MatchingFetchOptions extends PackThenOverpassProgress {
  customMatchingAreas?: CustomMatchingAreasByLevel;
  customCategories?: readonly SessionCustomCategory[];
  regionPackId?: RegionPackId;
  /** Pack subregion (e.g. Australia `stateId`) for bandwidth-scoped POI slices. */
  subregionId?: string;
  transitMetroId?: string | null;
  transitStationFilter?: TransitRouteFilter | null;
  /** Map pins tagged with this point category; appended after Overpass / pack features. */
  poiPins?: readonly { id: string; name: string; point: LatLngTuple }[];
  onEnrich?: (features: MatchingFeature[]) => void;
}

export type OverpassElement = {
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};
