import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "./annotations";
import {
  annotationMatchesMapTool,
  findAnnotationMapTool,
  mapToolDockShortLabel,
  QUESTION_DOCK_OVERFLOW_IDS,
  QUESTION_DOCK_PRIMARY_IDS,
  QUESTION_DOCK_TOOL_IDS,
} from "./mapTools";

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

  it("uses full dock short labels for tentacle and thermometer", () => {
    expect(mapToolDockShortLabel("tentacle")).toBe("Tentacles");
    expect(mapToolDockShortLabel("thermometer")).toBe("Thermometer");
  });

  it("freezes question dock primary ids in strip order", () => {
    expect([...QUESTION_DOCK_PRIMARY_IDS]).toEqual(["matching", "measuring", "radar", "tentacle"]);
  });

  it("freezes question dock overflow ids in menu order", () => {
    expect([...QUESTION_DOCK_OVERFLOW_IDS]).toEqual(["thermometer", "photo"]);
  });

  it("partitions question dock tools into primary and overflow without overlap", () => {
    const primary = new Set(QUESTION_DOCK_PRIMARY_IDS);
    const overflow = new Set(QUESTION_DOCK_OVERFLOW_IDS);
    for (const id of QUESTION_DOCK_TOOL_IDS) {
      expect(primary.has(id) || overflow.has(id)).toBe(true);
    }
    for (const id of QUESTION_DOCK_PRIMARY_IDS) {
      expect(overflow.has(id)).toBe(false);
    }
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
