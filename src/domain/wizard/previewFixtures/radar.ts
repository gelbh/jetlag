import { milesToMeters } from "../../map/distance";
import type { RadarAnswer } from "../../questions";

export interface RadarPreviewFixture {
  radiusMeters: number | null;
  chooseCustom: boolean;
  customRadius: string;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  answer: RadarAnswer | null;
  awaitHiderAnswer: boolean;
}

export const RADAR_PREVIEW_ANCHOR: RadarPreviewFixture = {
  radiusMeters: milesToMeters(3),
  chooseCustom: false,
  customRadius: "",
  awaitingPlacement: true,
  hasCenter: false,
  answer: null,
  awaitHiderAnswer: false,
};

export const RADAR_PREVIEW_SOLO_ANSWER: RadarPreviewFixture = {
  radiusMeters: milesToMeters(3),
  chooseCustom: false,
  customRadius: "",
  awaitingPlacement: false,
  hasCenter: true,
  answer: "yes",
  awaitHiderAnswer: false,
};

export const RADAR_PREVIEW_HIDERS_DISTANCE: RadarPreviewFixture = {
  ...RADAR_PREVIEW_SOLO_ANSWER,
  answer: null,
  awaitHiderAnswer: true,
};
