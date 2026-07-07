import { describe, expect, it } from "vitest";
import {
  BODY_OF_WATER_MEASURING_QUESTION,
  measuringQuestionFor,
  measuringUsesAllPlacesInArea,
} from "./measuringQuestions";

describe("body of water measuring question", () => {
  it("uses the multi-place pipeline for all named waters in the play area", () => {
    expect(measuringUsesAllPlacesInArea("body_of_water")).toBe(true);
  });

  it("returns the official rule text and prompt", () => {
    expect(
      measuringQuestionFor("location", "body_of_water"),
    ).toEqual(BODY_OF_WATER_MEASURING_QUESTION);
  });
});
