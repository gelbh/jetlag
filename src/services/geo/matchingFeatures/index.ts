export {
  MATCHING_NEAR_FEATURE_SEARCH_BUFFER_METERS,
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

export type { MatchingFeature } from "../../../domain/geo/types";
