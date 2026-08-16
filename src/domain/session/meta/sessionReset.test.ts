import { describe, expect, it } from "vitest";
import { createTestPinAnnotation } from "../../../test/fixtures/sessions";
import {
  filterAnnotationsAfterReset,
  filterExtrasAfterReset,
  isStaleAfterReset,
} from "./sessionReset";

describe("sessionReset", () => {
  it("treats records before the reset watermark as stale", () => {
    expect(
      isStaleAfterReset("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"),
    ).toBe(true);
    expect(
      isStaleAfterReset("2026-01-03T00:00:00.000Z", "2026-01-02T00:00:00.000Z"),
    ).toBe(false);
  });

  it("treats pre-reset annotation createdAt as stale", () => {
    expect(
      isStaleAfterReset("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"),
    ).toBe(true);
  });

  it("treats missing timestamps as stale after reset", () => {
    expect(isStaleAfterReset(undefined, "2026-01-02T00:00:00.000Z")).toBe(true);
    expect(isStaleAfterReset("", "2026-01-02T00:00:00.000Z")).toBe(true);
  });

  it("filters extras after reset", () => {
    const items = [
      { id: "old", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "new", createdAt: "2026-01-03T00:00:00.000Z" },
    ];

    expect(
      filterExtrasAfterReset(
        items,
        "2026-01-02T00:00:00.000Z",
        (item) => item.createdAt,
      ).map((item) => item.id),
    ).toEqual(["new"]);
  });

  it("filters annotations by metadata.createdAt against sessionResetAt", () => {
    const stale = createTestPinAnnotation({
      id: "stale",
      metadata: {
        createdAt: "2026-01-01T00:00:00.000Z",
        label: "old",
      },
    });
    const fresh = createTestPinAnnotation({
      id: "fresh",
      metadata: {
        createdAt: "2026-01-03T00:00:00.000Z",
        label: "new",
      },
    });

    expect(
      filterAnnotationsAfterReset(
        [stale, fresh],
        "2026-01-02T00:00:00.000Z",
      ).map((annotation) => annotation.id),
    ).toEqual(["fresh"]);
  });
});
