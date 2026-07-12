import { describe, expect, it } from "vitest";
import { filterExtrasAfterReset, isStaleAfterReset } from "./sessionReset";

describe("sessionReset", () => {
  it("treats records before the reset watermark as stale", () => {
    expect(
      isStaleAfterReset("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"),
    ).toBe(true);
    expect(
      isStaleAfterReset("2026-01-03T00:00:00.000Z", "2026-01-02T00:00:00.000Z"),
    ).toBe(false);
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
});
