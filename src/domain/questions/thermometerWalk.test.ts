import { describe, expect, it } from "vitest";
import {
  THERMOMETER_WALK_MAX_DURATION_MS,
  buildThermometerLineGeometry,
  crowFliesDistanceMeters,
  isStaleThermometerWalk,
  listOrphanWalkingThermometerQuestionIds,
  listWalkingThermometerQuestionIds,
  parseThermometerStartPoint,
} from "./thermometerWalk";

describe("thermometerWalk", () => {
  it("parses start point from placement geometry", () => {
    const placement = {
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-6.26, 53.35] },
      }),
      metadata: {},
    };
    expect(parseThermometerStartPoint(placement)).toEqual([53.35, -6.26]);
  });

  it("measures crow-flies distance", () => {
    const a: [number, number] = [53.35, -6.26];
    const b: [number, number] = [53.36, -6.25];
    expect(crowFliesDistanceMeters(a, b)).toBeGreaterThan(0);
  });

  it("builds line geometry between two points", () => {
    const feature = buildThermometerLineGeometry([53.35, -6.26], [53.36, -6.25]);
    expect(feature.geometry.type).toBe("LineString");
    expect(feature.geometry.coordinates).toHaveLength(2);
  });

  it("exports 30 minute walk max duration", () => {
    expect(THERMOMETER_WALK_MAX_DURATION_MS).toBe(30 * 60 * 1000);
  });

  it("lists walking thermometer ids for a uid", () => {
    const ids = listWalkingThermometerQuestionIds(
      [
        { id: "a", toolType: "thermometer", status: "walking", createdByUid: "u1" },
        { id: "b", toolType: "thermometer", status: "pending", createdByUid: "u1" },
        { id: "c", toolType: "radar", status: "walking", createdByUid: "u1" },
        { id: "d", toolType: "thermometer", status: "walking", createdByUid: "u2" },
      ] as never,
      "u1",
    );
    expect(ids).toEqual(["a"]);
  });

  it("lists orphan walking thermometers when creator not in members", () => {
    const ids = listOrphanWalkingThermometerQuestionIds(
      [
        { id: "a", toolType: "thermometer", status: "walking", createdByUid: "gone" },
        { id: "b", toolType: "thermometer", status: "walking", createdByUid: "here" },
      ] as never,
      ["here"],
    );
    expect(ids).toEqual(["a"]);
  });

  it("detects stale walking thermometer when age and location are old", () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const nowMs = Date.parse(createdAt) + THERMOMETER_WALK_MAX_DURATION_MS;
    const question = {
      id: "a",
      toolType: "thermometer",
      status: "walking",
      createdByUid: "u1",
      createdAt,
    } as never;

    expect(isStaleThermometerWalk(question, null, nowMs)).toBe(true);
    expect(
      isStaleThermometerWalk(
        question,
        "2026-01-01T00:00:00.000Z",
        nowMs,
      ),
    ).toBe(true);
    expect(
      isStaleThermometerWalk(
        question,
        new Date(nowMs - 30_000).toISOString(),
        nowMs,
      ),
    ).toBe(false);
    expect(
      isStaleThermometerWalk(
        question,
        null,
        Date.parse(createdAt) + THERMOMETER_WALK_MAX_DURATION_MS - 1,
      ),
    ).toBe(false);
  });
});
