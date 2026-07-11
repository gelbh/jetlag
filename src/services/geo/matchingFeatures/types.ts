import type { CustomMatchingAreasByLevel } from "../../../domain/session/sessionCustomContent";
import type { SessionCustomCategory } from "../../../domain/session/sessionCustomContent";

export const MATCHING_NEAR_FEATURE_SEARCH_BUFFER_METERS = 50_000;

export interface MatchingFetchOptions {
  customMatchingAreas?: CustomMatchingAreasByLevel;
  customCategories?: readonly SessionCustomCategory[];
}

export type OverpassElement = {
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};
