import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "./annotations";
import {
  RADAR_RADIUS_PRESET_METERS,
  firstAvailableRadarDistanceSelection,
  isRadarDistanceOptionAvailable,
  radarAnnotationSummary,
  radarAnswerFromInside,
  radarDistanceOptionLabel,
  radarInsideFromAnswer,
  radarQuestionPrompt,
  usedRadarDistanceOptions,
} from "./radarQuestions";
import { milesToMeters } from "./distance";

describe("radarQuestions", () => {
  it("builds the live prompt from the resolved radius", () => {
    expect(radarQuestionPrompt(milesToMeters(1), "imperial")).toBe(
      "Are you within 1.0 mi of me?",
    );
    expect(radarQuestionPrompt(milesToMeters(25), "imperial")).toBe(
      "Are you within 25 mi of me?",
    );
    expect(radarQuestionPrompt(2500, "metric")).toBe(
      "Are you within 2.5 km of me?",
    );
  });

  it("labels card distance options in imperial and metric modes", () => {
    expect(radarDistanceOptionLabel(0.25, "imperial")).toBe("1/4 Mile");
    expect(radarDistanceOptionLabel(0.5, "imperial")).toBe("1/2 Mile");
    expect(radarDistanceOptionLabel(1, "imperial")).toBe("1 Mile");
    expect(radarDistanceOptionLabel(3, "imperial")).toBe("3 Miles");
    expect(radarDistanceOptionLabel(100, "imperial")).toBe("100 Miles");
    expect(radarDistanceOptionLabel(1, "metric")).toBe("1.6 km");
  });

  it("maps yes/no answers to inside shading", () => {
    expect(radarInsideFromAnswer("yes")).toBe(false);
    expect(radarInsideFromAnswer("no")).toBe(true);
    expect(radarAnswerFromInside(false)).toBe("yes");
    expect(radarAnswerFromInside(true)).toBe("no");
  });

  it("summarizes answered and legacy radar annotations", () => {
    const answered: AnnotationRecord = {
      id: "radar-1",
      sessionId: "local",
      type: "radar",
      status: "active",
      geometry: {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [0, 0] },
      },
      metadata: {
        createdAt: "2026-01-01T00:00:00.000Z",
        radiusMeters: milesToMeters(3),
        inside: false,
      },
    };

    expect(radarAnnotationSummary(answered, "imperial")).toBe(
      "Radar · Are you within 3.0 mi of me? · yes",
    );

    const legacy: AnnotationRecord = {
      ...answered,
      id: "radar-2",
      metadata: {
        ...answered.metadata,
        inside: undefined,
      },
    };

    expect(radarAnnotationSummary(legacy, "imperial")).toBe(
      "Radar · Are you within 3.0 mi of me?",
    );
  });

  it("exposes nine mile presets in meters", () => {
    expect(RADAR_RADIUS_PRESET_METERS).toHaveLength(9);
    expect(RADAR_RADIUS_PRESET_METERS[0]).toBeCloseTo(milesToMeters(0.25));
    expect(RADAR_RADIUS_PRESET_METERS.at(-1)).toBeCloseTo(milesToMeters(100));
  });

  it("tracks used radar distance options, including choose once", () => {
    const presetRadar: AnnotationRecord = {
      id: "radar-preset",
      sessionId: "local",
      type: "radar",
      status: "active",
      geometry: {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [0, 0] },
      },
      metadata: {
        createdAt: "2026-01-01T00:00:00.000Z",
        radiusMeters: milesToMeters(3),
        radarChooseCustom: false,
        inside: false,
      },
    };
    const chooseRadar: AnnotationRecord = {
      ...presetRadar,
      id: "radar-choose",
      metadata: {
        ...presetRadar.metadata,
        radiusMeters: milesToMeters(7),
        radarChooseCustom: true,
      },
    };

    expect(usedRadarDistanceOptions([presetRadar, chooseRadar])).toEqual(
      new Set([3, "choose"]),
    );
    expect(
      usedRadarDistanceOptions([presetRadar, chooseRadar], "radar-preset"),
    ).toEqual(new Set(["choose"]));
    expect(
      firstAvailableRadarDistanceSelection(new Set([3, "choose"])),
    ).toEqual({
      chooseCustom: false,
      radiusMeters: milesToMeters(0.25),
    });
    expect(
      isRadarDistanceOptionAvailable(new Set([3]), false, milesToMeters(3)),
    ).toBe(false);
    expect(isRadarDistanceOptionAvailable(new Set(["choose"]), true, 0)).toBe(
      false,
    );
  });
});
