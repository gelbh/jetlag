import { describe, expect, it } from "vitest";
import {
  DEFAULT_RADIUS_METERS,
  formatAltitude,
  formatAltitudeLabel,
  formatDistance,
  formatPresetDistance,
  milesToMeters,
  parseDistanceInput,
} from "./distance";

describe("distance helpers", () => {
  it("formats metric distances", () => {
    expect(formatDistance(500, "metric")).toBe("500 m");
    expect(formatDistance(1500, "metric")).toBe("1.5 km");
  });

  it("formats imperial distances", () => {
    expect(formatDistance(1609.344, "imperial")).toBe("1.0 mi");
    expect(formatPresetDistance(milesToMeters(3), "imperial")).toBe("3 mi");
    expect(formatPresetDistance(milesToMeters(0.25), "imperial")).toBe(
      "1/4 mi",
    );
    expect(formatPresetDistance(milesToMeters(0.5), "imperial")).toBe("1/2 mi");
    expect(formatPresetDistance(milesToMeters(25), "imperial")).toBe("25 mi");
    expect(formatPresetDistance(milesToMeters(50), "imperial")).toBe("50 mi");
    expect(formatPresetDistance(milesToMeters(100), "imperial")).toBe("100 mi");
  });

  it("uses one mile as the default radius", () => {
    expect(DEFAULT_RADIUS_METERS).toBeCloseTo(1609.344);
  });

  it("parses custom distance input", () => {
    expect(parseDistanceInput("2", "metric")).toBe(2);
    expect(parseDistanceInput("2", "imperial")).toBeCloseTo(3218.688);
  });

  it("formats altitude labels", () => {
    expect(formatAltitude(120, "metric")).toBe("120 m");
    expect(formatAltitude(-35, "metric")).toBe("35 m");
    expect(formatAltitudeLabel(120, "metric")).toBe("120 m above sea level");
    expect(formatAltitudeLabel(-35, "metric")).toBe("35 m below sea level");
    expect(formatAltitudeLabel(0, "metric")).toBe("at sea level");
    expect(formatAltitude(304.8, "imperial")).toBe("1000 ft");
  });
});
