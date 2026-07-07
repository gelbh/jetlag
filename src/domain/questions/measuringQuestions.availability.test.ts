import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "../map/annotations";
import {
  firstAvailableMeasuringFromKind,
  usedMeasuringFromKinds,
} from "./measuringQuestions";

describe("measuring availability", () => {
  it("tracks used measure categories from active annotations", () => {
    const used = usedMeasuringFromKinds([
      {
        id: "1",
        sessionId: "local",
        type: "measuring",
        status: "active",
        geometry: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        metadata: {
          createdAt: "2026-01-01T00:00:00.000Z",
          measuringSubject: "location",
          measuringLocationCategory: "zoo",
        },
      },
      {
        id: "2",
        sessionId: "local",
        type: "measuring",
        status: "deleted",
        geometry: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        metadata: {
          createdAt: "2026-01-01T00:00:00.000Z",
          measuringSubject: "coastline",
        },
      },
    ] satisfies AnnotationRecord[]);

    expect(used).toEqual(new Set(["zoo"]));
    expect(firstAvailableMeasuringFromKind(used)).toBe("commercial_airport");
  });

  it("maps legacy place annotations to custom place", () => {
    const used = usedMeasuringFromKinds([
      {
        id: "1",
        sessionId: "local",
        type: "measuring",
        status: "active",
        geometry: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        metadata: {
          createdAt: "2026-01-01T00:00:00.000Z",
          measuringSubject: "location",
          measuringLocationCategory: "place",
        },
      },
    ] as unknown as AnnotationRecord[]);

    expect(used).toEqual(new Set(["custom_place"]));
  });
});
