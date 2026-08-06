import { describe, expect, it } from "vitest";
import {
  canTransitionPreloadRequestStatus,
  countOpenPreloadRequests,
  deserializePreloadRequest,
  preloadRequestStatusChipLabel,
} from "./preloadRequestAdmin";
import type { PreloadRequest } from "./preloadRequestTypes";

describe("preloadRequestAdmin", () => {
  it("covers allowed and disallowed status edges", () => {
    const allowed = [
      ["open", "accepted"],
      ["open", "declined"],
      ["open", "shipped"],
      ["accepted", "shipped"],
      ["accepted", "declined"],
      ["accepted", "open"],
      ["declined", "open"],
      ["declined", "accepted"],
      ["shipped", "open"],
    ] as const;
    for (const [from, to] of allowed) {
      expect(canTransitionPreloadRequestStatus(from, to)).toBe(true);
    }
    expect(canTransitionPreloadRequestStatus("shipped", "accepted")).toBe(false);
    expect(canTransitionPreloadRequestStatus("shipped", "declined")).toBe(false);
    expect(canTransitionPreloadRequestStatus("open", "open")).toBe(false);
    expect(canTransitionPreloadRequestStatus("declined", "shipped")).toBe(false);
  });

  it("deserializes a valid Firestore doc", () => {
    const request = deserializePreloadRequest("pre-1", {
      status: "open",
      createdAt: "2026-08-05T00:00:00.000Z",
      updatedAt: "2026-08-05T01:00:00.000Z",
      reporterUid: "uid-1",
      note: "Please pack Dublin",
      presetSnapshot: {
        name: "Dublin custom",
        gameSize: "medium",
        distanceUnit: "metric",
        placeLabel: "Dublin",
        gameAreaBytes: 128,
        focusBounds: { south: 1, west: 2, north: 3, east: 4 },
      },
    });

    expect(request).toMatchObject({
      id: "pre-1",
      status: "open",
      note: "Please pack Dublin",
      presetSnapshot: {
        name: "Dublin custom",
        placeLabel: "Dublin",
        gameAreaBytes: 128,
        focusBounds: { south: 1, west: 2, north: 3, east: 4 },
      },
    });
  });

  it("rejects non-finite snapshot numbers", () => {
    const request = deserializePreloadRequest("pre-2", {
      status: "open",
      createdAt: "2026-08-05T00:00:00.000Z",
      updatedAt: "2026-08-05T01:00:00.000Z",
      reporterUid: "uid-1",
      presetSnapshot: {
        name: "Bad nums",
        gameSize: "small",
        distanceUnit: "metric",
        gameAreaBytes: Number.NaN,
        focusBounds: {
          south: Number.POSITIVE_INFINITY,
          west: 0,
          north: 1,
          east: 1,
        },
      },
    });

    expect(request?.presetSnapshot.gameAreaBytes).toBeUndefined();
    expect(request?.presetSnapshot.focusBounds).toBeUndefined();
  });

  it("counts open requests and labels chips", () => {
    const rows: PreloadRequest[] = [
      {
        id: "a",
        createdAt: "t",
        updatedAt: "t",
        status: "open",
        reporterUid: "u",
        presetSnapshot: {
          name: "A",
          gameSize: "small",
          distanceUnit: "metric",
        },
      },
      {
        id: "b",
        createdAt: "t",
        updatedAt: "t",
        status: "shipped",
        reporterUid: "u",
        presetSnapshot: {
          name: "B",
          gameSize: "small",
          distanceUnit: "metric",
        },
      },
    ];
    expect(countOpenPreloadRequests(rows)).toBe(1);
    expect(preloadRequestStatusChipLabel("accepted")).toBe("ACCEPTED");
  });
});
