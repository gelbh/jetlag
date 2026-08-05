export {
  type MatchingFetchOptions,
} from "./types";

export {
  buildMatchingFeaturesQuery,
  buildStreetPathQuery,
  formatOverpassBbox,
  matchingFeaturesCacheKey,
  matchingSearchBoundingBox,
} from "./query";

export {
  countMatchingFeaturesInPlayArea,
  parseMatchingFeatures,
} from "./parse";

export {
  buildLetterZoneFeatures,
  buildStationFirstLetterFeatures,
  buildStationNameLengthFeatures,
} from "./specialized";

export {
  fetchStationFeaturesInArea,
  fetchStreetPathFeaturesInArea,
  fetchTransitLineMatchingFeaturesInArea,
  fetchTransitStationsForHidingZone,
  fetchTransitStationsForHidingZoneViewport,
} from "./transit";

export {
  fetchMatchingFeaturesInArea,
  findNearestMatchingFeature,
  pickMatchingFeatureForAnchor,
} from "./fetch";

export {
  matchingFeatureCountLabel,
  matchingFeatureNotFoundMessage,
  matchingNullAnswerMessage,
  matchingResolveFailureMessage,
} from "./messages";

export type { MatchingFeature } from "@/domain/geo/types";

export {
  parseMatchingAreaGeoJson,
  customMatchingAreasCacheSuffix,
} from "./matchingAreaGeoJson";
export {
  clearResolvedMatchingAreasCacheForTests,
  isPlayAreaReadySync,
  matchingAreasCacheKey,
  peekResolvedPlayArea,
  playAreaCacheKey,
  resolveSessionMatchingAreas,
  resolveSessionPlayArea,
  type SessionMatchingAreasInput,
  type SessionPlayAreaInput,
} from "./resolveSessionMatchingAreas";
export {
  adminLevelForRegionPackAsset,
  clearRegionPackGeoCacheForTests,
  loadRegionPackMatchingAreas,
  loadRegionPackPlayArea,
  loadRegionPackSessionBoundaries,
  regionPackHasBundledBoundaries,
  type RegionPackSessionBoundaries,
} from "./regionPackBoundaries";
