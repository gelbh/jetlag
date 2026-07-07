import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "./annotations";
import { annotationMatchesMapTool, findAnnotationMapTool } from "./mapTools";

function annotation(
  overrides: Partial<AnnotationRecord> & Pick<AnnotationRecord, "type">,
): AnnotationRecord {
  return {
    id: "ann-1",
    sessionId: "local",
    status: "active",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [0, 0] },
    },
    metadata: { createdAt: "2026-01-01T00:00:00.000Z" },
    ...overrides,
  };
}

describe("mapTools", () => {
  it("treats migrated measuring annotations as measuring tool matches", () => {
    const measuring = annotation({ type: "measuring" });
    expect(annotationMatchesMapTool(measuring, "measuring")).toBe(true);
    expect(findAnnotationMapTool(measuring)).toBe("measuring");
  });

  it("treats legacy thermometer measuring rows as measuring tool matches", () => {
    const legacy = annotation({
      type: "thermometer",
      metadata: {
        createdAt: "2026-01-01T00:00:00.000Z",
        measuringSubject: "location",
      },
    });
    expect(annotationMatchesMapTool(legacy, "measuring")).toBe(true);
    expect(annotationMatchesMapTool(legacy, "thermometer")).toBe(false);
    expect(findAnnotationMapTool(legacy)).toBe("measuring");
  });
});
