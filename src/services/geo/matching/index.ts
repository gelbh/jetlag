export type { MatchingFeature } from "@/domain/geo/types";
export {
  fetchMatchingFeaturesInArea,
  findNearestMatchingFeature,
  pickMatchingFeatureForAnchor,
} from "./fetch";
export {
  customMatchingAreasCacheSuffix,
  parseMatchingAreaGeoJson,
} from "./matchingAreaGeoJson";
export {
  matchingEmptyPlayAreaMessage,
  matchingFeatureCountLabel,
  matchingFeatureNotFoundMessage,
  matchingNullAnswerMessage,
  matchingResolveFailureMessage,
} from "./messages";
export {
  countMatchingFeaturesInPlayArea,
  parseMatchingFeatures,
} from "./parse";
export {
  buildMatchingFeaturesQuery,
  buildStreetPathQuery,
  formatOverpassBbox,
  matchingFeaturesCacheKey,
  matchingSearchBoundingBox,
} from "./query";
export {
  adminLevelForRegionPackAsset,
  clearRegionPackGeoCacheForTests,
  loadRegionPackMatchingAreas,
  loadRegionPackPlayArea,
  loadRegionPackSessionBoundaries,
  type RegionPackSessionBoundaries,
  regionPackHasBundledBoundaries,
} from "./regionPackBoundaries";
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
export { type MatchingFetchOptions } from "./types";
