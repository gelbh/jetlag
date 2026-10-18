import type { MatchingFeature } from "@/domain/geo/types";
import type { LatLngTuple } from "@/domain/geometry/kernel/types";
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
  /** Map pins tagged with this point category; appended after Overpass / pack features. */
  poiPins?: readonly { id: string; name: string; point: LatLngTuple }[];
  /** When pack POI hits, return immediately and deliver Overpass-merged features here. */
  onEnrich?: (features: MatchingFeature[]) => void;
}

export type OverpassElement = {
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};
