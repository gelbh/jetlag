import { describe, expect, it } from "vitest";
import {
  annotationSupportsGeometryEdit,
  annotationSupportsPostAnswerEdit,
} from "./annotationEditPolicy";
import type { AnnotationRecord } from "./annotations";

function stub(type: AnnotationRecord["type"]): AnnotationRecord {
  return {
    id: "a",
    sessionId: "local",
    type,
    status: "active",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [0, 0] },
    },
    metadata: { createdAt: "2026-01-01T00:00:00.000Z" },
  };
}

describe("annotationEditPolicy", () => {
  it("refuses post-answer and geometry edit for tentacle", () => {
    const tentacle = stub("tentacle");
    expect(annotationSupportsPostAnswerEdit(tentacle)).toBe(false);
    expect(annotationSupportsGeometryEdit(tentacle)).toBe(false);
  });

  it("allows other annotation kinds", () => {
    for (const type of ["pin", "radar", "zone", "matching", "measuring", "thermometer"] as const) {
      expect(annotationSupportsPostAnswerEdit(stub(type))).toBe(true);
      expect(annotationSupportsGeometryEdit(stub(type))).toBe(true);
    }
  });
});
