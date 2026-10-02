import type { MatchingFeature } from "@/domain/geo/types";
import type { RegionPackId } from "@/domain/regions/regionPack";
import type {
  CustomMatchingAreasByLevel,
  SessionCustomCategory,
} from "@/domain/session/catalog/sessionCustomContent";

export interface MatchingFetchOptions {
  customMatchingAreas?: CustomMatchingAreasByLevel;
  customCategories?: readonly SessionCustomCategory[];
  regionPackId?: RegionPackId;
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
