import { describe, expect, it } from "vitest";
import { annotationSummary } from "../map/annotations";
import {
  DEFAULT_THERMOMETER_DISTANCE_METERS,
  THERMOMETER_DISTANCE_PRESETS,
  THERMOMETER_DISTANCE_PRESETS_MILES,
  thermometerDistanceLabel,
  thermometerHotterTowards,
  thermometerQuestionPrompt,
  thermometerShadedSide,
} from "./thermometerQuestions";
import {
  availableThermometerDistancePresets,
  firstAvailableThermometerDistanceMeters,
  isThermometerDistanceOptionAvailable,
  thermometerDistanceOptionForAnnotation,
  thermometerPresetMilesForMeters,
  usedThermometerDistanceOptions,
} from "./thermometerQuestions";
import { milesToMeters } from "../map/distance";

describe("thermometerQuestions", () => {
  it("converts mile presets to meters", () => {
    expect(THERMOMETER_DISTANCE_PRESETS).toEqual(
      THERMOMETER_DISTANCE_PRESETS_MILES.map(milesToMeters),
    );
    expect(DEFAULT_THERMOMETER_DISTANCE_METERS).toBe(milesToMeters(0.5));
  });

  it("formats distance labels for the question copy", () => {
    expect(
      thermometerDistanceLabel(DEFAULT_THERMOMETER_DISTANCE_METERS, "imperial"),
    ).toBe("1/2 mile");
    expect(thermometerDistanceLabel(milesToMeters(3), "imperial")).toBe(
      "3 miles",
    );
    expect(thermometerQuestionPrompt(milesToMeters(10), "imperial")).toBe(
      "After traveling 10 miles, am I hotter or colder?",
    );
  });

  it("maps hider answers to shaded sides and hotter direction", () => {
    expect(thermometerShadedSide("hotter")).toBe("cold");
    expect(thermometerShadedSide("colder")).toBe("hot");
    expect(thermometerShadedSide(null)).toBe("cold");
    expect(thermometerHotterTowards("hotter")).toBe("b");
    expect(thermometerHotterTowards("colder")).toBe("a");
  });

  it("tracks used thermometer distance options per session", () => {
    const halfMile = milesToMeters(0.5);
    const threeMiles = milesToMeters(3);
    const thermometer = {
      id: "thermo-1",
      sessionId: "session-1",
      type: "thermometer" as const,
      geometry: {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      },
      metadata: {
        createdAt: "2026-05-14T00:00:00.000Z",
        thermometerDistanceMeters: threeMiles,
        thermometerAnswer: "hotter" as const,
      },
      status: "active" as const,
    };

    expect(thermometerPresetMilesForMeters(halfMile)).toBe(0.5);
    expect(thermometerDistanceOptionForAnnotation(thermometer)).toBe(3);
    expect(usedThermometerDistanceOptions([thermometer])).toEqual(new Set([3]));
    expect(usedThermometerDistanceOptions([thermometer], "thermo-1")).toEqual(
      new Set(),
    );
    expect(
      firstAvailableThermometerDistanceMeters(
        usedThermometerDistanceOptions([thermometer]),
      ),
    ).toBe(halfMile);
    expect(isThermometerDistanceOptionAvailable("large", threeMiles)).toBe(true);
    expect(availableThermometerDistancePresets("large")).toEqual(
      THERMOMETER_DISTANCE_PRESETS,
    );
  });
});

describe("annotationSummary for thermometers", () => {
  it("includes the question and answer for classic thermometers", () => {
    const summary = annotationSummary(
      {
        id: "thermo-1",
        sessionId: "session-1",
        type: "thermometer",
        geometry: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        },
        metadata: {
          createdAt: "2026-05-14T00:00:00.000Z",
          thermometerDistanceMeters: milesToMeters(3),
          thermometerAnswer: "hotter",
        },
        status: "active",
      },
      "imperial",
    );

    expect(summary).toBe(
      "After traveling 3 miles, am I hotter or colder? · hotter",
    );
  });
});
