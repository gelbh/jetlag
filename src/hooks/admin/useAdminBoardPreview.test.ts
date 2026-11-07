import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "@/domain/map/annotations";
import { useAdminBoardPreview } from "./useAdminBoardPreview";

function annotation(id: string, overrides: Partial<AnnotationRecord> = {}): AnnotationRecord {
  return {
    id,
    sessionId: "session-1",
    type: "pin",
    status: "active",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-6.26, 53.35] },
    },
    metadata: { createdAt: "2026-01-01T00:00:00.000Z" },
    ...overrides,
  };
}

function thermometer(id: string): AnnotationRecord {
  return annotation(id, {
    type: "thermometer",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-6.27, 53.34],
          [-6.25, 53.36],
        ],
      },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      thermometerAnswer: "colder",
      hotterTowards: "a",
    },
  });
}

describe("useAdminBoardPreview", () => {
  it("soft-delete preview marks the annotation deleted", () => {
    const live = [annotation("a1"), annotation("a2")];
    const { result } = renderHook(() => useAdminBoardPreview(live));

    act(() => {
      result.current.preview({ action: "softDeleteAnnotation", annotationId: "a1" });
    });

    expect(result.current.previewAnnotations?.find((row) => row.id === "a1")?.status).toBe(
      "deleted",
    );
    expect(result.current.previewAnnotations?.find((row) => row.id === "a2")?.status).toBe(
      "active",
    );
  });

  it("restore preview forces active", () => {
    const live = [annotation("a1", { status: "deleted" })];
    const { result } = renderHook(() => useAdminBoardPreview(live));

    act(() => {
      result.current.preview({ action: "restoreAnnotation", annotationId: "a1" });
    });

    expect(result.current.previewAnnotations?.[0]?.status).toBe("active");
  });

  it("recompute preview patches thermometer metadata from hide", () => {
    const live = [thermometer("thermo-1")];
    const { result } = renderHook(() => useAdminBoardPreview(live));

    act(() => {
      result.current.preview({
        action: "recomputeThermometerFromHide",
        annotationId: "thermo-1",
        hide: { lat: 53.34, lng: -6.27 },
      });
    });

    const preview = result.current.previewAnnotations?.[0];
    expect(preview?.status).toBe("active");
    // Hide at point A → colder (farther from B), hotterTowards a.
    expect(preview?.metadata.thermometerAnswer).toBe("colder");
    expect(preview?.metadata.hotterTowards).toBe("a");
  });

  it("clear restores live annotations", () => {
    const live = [annotation("a1")];
    const { result } = renderHook(() => useAdminBoardPreview(live));

    act(() => {
      result.current.preview({ action: "softDeleteAnnotation", annotationId: "a1" });
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.previewAnnotations).toBeNull();
    expect(result.current.pendingOp).toBeNull();
  });
});
