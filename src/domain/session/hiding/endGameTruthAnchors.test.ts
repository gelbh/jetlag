import { describe, expect, it } from "vitest";
import {
  assembleEndGameAcceptAnchors,
  assembleEndGameStartAnchors,
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

  it("assembles accept anchors with a local GPS override", () => {
    const result = assembleEndGameAcceptAnchors({
      hiderUids: ["hider-a", "hider-b"],
      hiderLocations: [
        { uid: "hider-a", lat: 51.1, lng: -0.1 },
        { uid: "hider-b", lat: 51.2, lng: -0.2 },
      ],
      localHiderUid: "hider-a",
      localPoint: { lat: 52.0, lng: -1.0 },
      frozenAt: "2026-01-01T00:00:00.000Z",
    });

    expect("missing" in result).toBe(false);
    if ("missing" in result) {
      return;
    }

    expect(result["hider-a"]).toEqual({
      lat: 52.0,
      lng: -1.0,
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("only requires locations for the confirmed-zone hider uids passed in", () => {
    const result = assembleEndGameAcceptAnchors({
      hiderUids: ["hider-a"],
      hiderLocations: [{ uid: "hider-a", lat: 51.1, lng: -0.1 }],
      localHiderUid: null,
      localPoint: null,
      frozenAt: "2026-01-01T00:00:00.000Z",
    });

    expect("missing" in result).toBe(false);
    if ("missing" in result) {
      return;
    }

    expect(Object.keys(result)).toEqual(["hider-a"]);
  });

  it("assembles start anchors preferring hiding place over zone center", () => {
    const result = assembleEndGameStartAnchors({
      hiderUids: ["hider-a", "hider-b"],
      hidingPlaces: [{ uid: "hider-a", lat: 52.0, lng: -1.0 }],
      zoneCenters: [
        { uid: "hider-a", lat: 51.1, lng: -0.1 },
        { uid: "hider-b", lat: 51.2, lng: -0.2 },
      ],
      frozenAt: "2026-01-01T00:00:00.000Z",
    });

    expect("missing" in result).toBe(false);
    if ("missing" in result) {
      return;
    }

    expect(result["hider-a"]).toEqual({
      lat: 52.0,
      lng: -1.0,
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result["hider-b"]).toEqual({
      lat: 51.2,
      lng: -0.2,
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("reports missing when a confirmed hider has neither hiding place nor zone center", () => {
    const result = assembleEndGameStartAnchors({
      hiderUids: ["hider-a", "hider-b"],
      hidingPlaces: [],
      zoneCenters: [{ uid: "hider-a", lat: 51.1, lng: -0.1 }],
      frozenAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result).toEqual({ missing: ["hider-b"] });
  });
});
