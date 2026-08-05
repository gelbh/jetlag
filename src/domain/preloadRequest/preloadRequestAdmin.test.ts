import { describe, expect, it } from "vitest";
import {
  canTransitionPreloadRequestStatus,
  countOpenPreloadRequests,
  deserializePreloadRequest,
  preloadRequestStatusChipLabel,
} from "./preloadRequestAdmin";
import type { PreloadRequest } from "./preloadRequestTypes";

describe("preloadRequestAdmin", () => {
  it("allows open → accepted / declined / shipped", () => {
    expect(canTransitionPreloadRequestStatus("open", "accepted")).toBe(true);
    expect(canTransitionPreloadRequestStatus("open", "declined")).toBe(true);
    expect(canTransitionPreloadRequestStatus("open", "shipped")).toBe(true);
    expect(canTransitionPreloadRequestStatus("shipped", "accepted")).toBe(false);
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
      },
    });

    expect(request).toMatchObject({
      id: "pre-1",
      status: "open",
      note: "Please pack Dublin",
      presetSnapshot: { name: "Dublin custom", placeLabel: "Dublin" },
    });
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
