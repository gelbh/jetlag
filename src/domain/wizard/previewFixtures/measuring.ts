import type {
  MeasuringAnswer,
  MeasuringFromKind,
  MeasuringSubject,
  MeasuringTargetMode,
} from "../../questions";
import { TUTORIAL_ANCHOR } from "./shared";

export interface MeasuringPreviewFixture {
  optionChosen: boolean;
  measureFrom: MeasuringFromKind;
  usesAllPlacesInArea: boolean;
  anchorLat: number | null;
  anchorLng: number | null;
  subject: MeasuringSubject;
  targetMode: MeasuringTargetMode;
  hasSeekerPoint: boolean;
  hasTargetPoint: boolean;
  seekerPlaceName: string | null;
  targetPlaceName: string | null;
  distanceMeters: number | null;
  loading: boolean;
  answer: MeasuringAnswer | null;
  awaitHiderAnswer: boolean;
}

export const MEASURING_PREVIEW_ANCHOR: MeasuringPreviewFixture = {
  optionChosen: false,
  measureFrom: "park",
  usesAllPlacesInArea: false,
  anchorLat: null,
  anchorLng: null,
  subject: "location",
  targetMode: "map",
  hasSeekerPoint: false,
  hasTargetPoint: false,
  seekerPlaceName: null,
  targetPlaceName: null,
  distanceMeters: null,
  loading: false,
  answer: null,
  awaitHiderAnswer: false,
};

export const MEASURING_PREVIEW_SOLO_ANSWER: MeasuringPreviewFixture = {
  optionChosen: true,
  measureFrom: "park",
  usesAllPlacesInArea: false,
  anchorLat: TUTORIAL_ANCHOR.lat,
  anchorLng: TUTORIAL_ANCHOR.lng,
  subject: "location",
  targetMode: "map",
  hasSeekerPoint: true,
  hasTargetPoint: true,
  seekerPlaceName: "Trinity College",
  targetPlaceName: "Phoenix Park",
  distanceMeters: 2400,
  loading: false,
  answer: "closer",
  awaitHiderAnswer: false,
};

export const MEASURING_PREVIEW_HIDERS_TARGET: MeasuringPreviewFixture = {
  ...MEASURING_PREVIEW_SOLO_ANSWER,
  answer: null,
  awaitHiderAnswer: true,
};
