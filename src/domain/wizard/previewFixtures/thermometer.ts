import { milesToMeters } from "../../map/distance";
import type { ThermometerAnswer } from "../../questions/thermometerQuestions";

export interface ThermometerPreviewFixture {
  distanceMeters: number;
  travelMeters: number | null;
  answer: ThermometerAnswer | null;
  mapStep: "a" | "b" | "ready";
  placementMode: "gps" | "manual";
  walkingActive: boolean;
  awaitHiderAnswer: boolean;
}

export const THERMOMETER_PREVIEW_SOLO_ANSWER: ThermometerPreviewFixture = {
  distanceMeters: milesToMeters(3),
  travelMeters: milesToMeters(2.4),
  answer: "hotter",
  mapStep: "ready",
  placementMode: "manual",
  walkingActive: false,
  awaitHiderAnswer: false,
};

export const THERMOMETER_PREVIEW_HIDERS_PLACEMENT: ThermometerPreviewFixture = {
  distanceMeters: milesToMeters(3),
  travelMeters: milesToMeters(2.4),
  answer: null,
  mapStep: "ready",
  placementMode: "manual",
  walkingActive: false,
  awaitHiderAnswer: true,
};

export const THERMOMETER_PREVIEW_DISTANCE: ThermometerPreviewFixture = {
  distanceMeters: milesToMeters(3),
  travelMeters: null,
  answer: null,
  mapStep: "a",
  placementMode: "manual",
  walkingActive: false,
  awaitHiderAnswer: false,
};
