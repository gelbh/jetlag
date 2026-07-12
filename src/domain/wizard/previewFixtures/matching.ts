import type { MatchingAnswer, MatchingCategoryId } from "../../questions";
import { TUTORIAL_ANCHOR } from "./shared";

export interface MatchingPreviewFixture {
  categoryId: MatchingCategoryId | null;
  categoryChosen: boolean;
  anchorLat: number | null;
  anchorLng: number | null;
  hasSeekerPoint: boolean;
  usesContainmentMatching: boolean;
  nearestFeatureName: string | null;
  distanceMeters: number | null;
  featureCount: number | null;
  inPlayAreaFeatureCount: number | null;
  nearestOutsidePlayArea: boolean;
  nullAnswer: boolean;
  loading: boolean;
  answer: MatchingAnswer | null;
  awaitHiderAnswer: boolean;
}

export const MATCHING_PREVIEW_ANCHOR: MatchingPreviewFixture = {
  categoryId: null,
  categoryChosen: false,
  anchorLat: null,
  anchorLng: null,
  hasSeekerPoint: false,
  usesContainmentMatching: false,
  nearestFeatureName: null,
  distanceMeters: null,
  featureCount: null,
  inPlayAreaFeatureCount: null,
  nearestOutsidePlayArea: false,
  nullAnswer: false,
  loading: false,
  answer: null,
  awaitHiderAnswer: false,
};

export const MATCHING_PREVIEW_SOLO_ANSWER: MatchingPreviewFixture = {
  categoryId: "park",
  categoryChosen: true,
  anchorLat: TUTORIAL_ANCHOR.lat,
  anchorLng: TUTORIAL_ANCHOR.lng,
  hasSeekerPoint: true,
  usesContainmentMatching: false,
  nearestFeatureName: "Phoenix Park",
  distanceMeters: 420,
  featureCount: 18,
  inPlayAreaFeatureCount: 14,
  nearestOutsidePlayArea: false,
  nullAnswer: false,
  loading: false,
  answer: "yes",
  awaitHiderAnswer: false,
};

export const MATCHING_PREVIEW_HIDERS_RESOLVE: MatchingPreviewFixture = {
  ...MATCHING_PREVIEW_SOLO_ANSWER,
  answer: null,
  awaitHiderAnswer: true,
};
