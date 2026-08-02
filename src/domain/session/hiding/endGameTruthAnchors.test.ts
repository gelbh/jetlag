import { describe, expect, it } from "vitest";
import {
  buildEndGameTruthAnchors,
  missingHiderUidsForAnchors,
} from "./endGameTruthAnchors";

describe("endGameTruthAnchors", () => {
  it("builds anchors for every confirmed hider", () => {
    const locations = new Map([
      ["hider-a", { lat: 51.1, lng: -0.1 }],
      ["hider-b", { lat: 51.2, lng: -0.2 }],
    ]);

    const result = buildEndGameTruthAnchors(
      ["hider-a", "hider-b"],
      locations,
      "2026-01-01T00:00:00.000Z",
    );

    expect("missing" in result).toBe(false);
    if ("missing" in result) {
      return;
    }

    expect(result["hider-a"]).toEqual({
      lat: 51.1,
      lng: -0.1,
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result["hider-b"]).toEqual({
      lat: 51.2,
      lng: -0.2,
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("returns missing uids when any hider lacks a usable location", () => {
    const locations = new Map([["hider-a", { lat: 51.1, lng: -0.1 }]]);

    const result = buildEndGameTruthAnchors(
      ["hider-a", "hider-b"],
      locations,
      "2026-01-01T00:00:00.000Z",
    );

    expect(result).toEqual({ missing: ["hider-b"] });
  });

  it("lists missing uids via missingHiderUidsForAnchors", () => {
    const locations = new Map([
      ["hider-a", { lat: Number.NaN, lng: -0.1 }],
      ["hider-b", { lat: 51.2, lng: -0.2 }],
    ]);

    expect(missingHiderUidsForAnchors(["hider-a", "hider-b"], locations)).toEqual([
      "hider-a",
    ]);
  });
});
