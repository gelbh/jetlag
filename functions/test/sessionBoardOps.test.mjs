import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeThermometerAnswerFromHide,
  parseThermometerEndpoints,
  summarizeAnnotation,
} from "../admin/sessionBoardOps.mjs";

describe("sessionBoardOps pure helpers", () => {
  it("computes colder when hide is closer to A than B", () => {
    const result = computeThermometerAnswerFromHide(
      { lng: -73.99, lat: 40.738 },
      { lng: -73.985, lat: 40.744 },
      { lng: -73.982, lat: 40.724 },
    );
    assert.equal(result.answer, "colder");
    assert.equal(result.hotterTowards, "a");
    assert.ok(result.distanceToB > result.distanceToA);
  });

  it("computes hotter when hide is closer to B than A", () => {
    const result = computeThermometerAnswerFromHide(
      { lng: -73.99, lat: 40.738 },
      { lng: -73.985, lat: 40.744 },
      { lng: -73.984, lat: 40.745 },
    );
    assert.equal(result.answer, "hotter");
    assert.equal(result.hotterTowards, "b");
  });

  it("parses Feature LineString endpoints", () => {
    const endpoints = parseThermometerEndpoints(
      JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [-73.99, 40.738],
            [-73.985, 40.744],
          ],
        },
      }),
    );
    assert.deepEqual(endpoints, {
      pointA: { lng: -73.99, lat: 40.738 },
      pointB: { lng: -73.985, lat: 40.744 },
    });
  });

  it("returns null for invalid thermometer geometry", () => {
    assert.equal(parseThermometerEndpoints("{}"), null);
    assert.equal(parseThermometerEndpoints("not-json"), null);
  });

  it("summarizes thermometer and radar annotations", () => {
    assert.deepEqual(
      summarizeAnnotation("t1", {
        type: "thermometer",
        status: "active",
        metadata: {
          createdAt: "2026-11-07T17:00:00.000Z",
          thermometerAnswer: "colder",
          hotterTowards: "a",
        },
      }),
      {
        id: "t1",
        type: "thermometer",
        status: "active",
        createdAt: "2026-11-07T17:00:00.000Z",
        answerSummary: "colder",
        hotterTowards: "a",
        radiusMeters: null,
      },
    );
    assert.equal(
      summarizeAnnotation("r1", {
        type: "radar",
        status: "active",
        metadata: { inside: true, radiusMeters: 1609.344 },
      }).answerSummary,
      "inside",
    );
  });
});
