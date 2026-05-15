import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "./annotations";
import {
  collectUsedAnnotationOptions,
  firstUnusedCatalogOption,
} from "./toolSessionOptions";

describe("toolSessionOptions", () => {
  it("collects active annotation options while excluding one annotation", () => {
    const annotations = [
      {
        id: "a",
        sessionId: "local",
        type: "matching",
        status: "active",
        geometry: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        metadata: {
          createdAt: "2026-01-01T00:00:00.000Z",
          matchingCategory: "commercial_airport",
        },
      },
      {
        id: "b",
        sessionId: "local",
        type: "matching",
        status: "deleted",
        geometry: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        metadata: {
          createdAt: "2026-01-01T00:00:00.000Z",
          matchingCategory: "commercial_port",
        },
      },
      {
        id: "c",
        sessionId: "local",
        type: "matching",
        status: "active",
        geometry: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        metadata: {
          createdAt: "2026-01-01T00:00:00.000Z",
          matchingCategory: "commercial_port",
        },
      },
    ] as AnnotationRecord[];

    const used = collectUsedAnnotationOptions(
      annotations,
      (item) => item.metadata.matchingCategory,
      "a",
    );

    expect([...used]).toEqual(["commercial_port"]);
  });

  it("returns the first unused catalog option", () => {
    const next = firstUnusedCatalogOption(
      [{ id: "airport" }, { id: "port" }, { id: "stadium" }],
      new Set(["airport"]),
    );

    expect(next).toBe("port");
  });
});
