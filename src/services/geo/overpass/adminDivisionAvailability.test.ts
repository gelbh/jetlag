import { describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import {
  adminBoundaryLevelsForSession,
  allAdminDivisionLevelsError,
  emptyAdminDivisionCounts,
  isAdminDivisionCategoryAvailable,
  isAdminDivisionCategoryListed,
  isAdminDivisionCategoryProbeFailed,
  isAdminDivisionCountAvailable,
  isMeasuringAdminBorderListed,
  isMeasuringAdminBorderProbeFailed,
  okAdminDivisionCounts,
  probeAdminDivisionCounts,
} from "./adminDivisionAvailability";
import * as adminDivisionBoundaries from "./adminDivisionBoundaries";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.3, 53.34],
      [-6.29, 53.34],
      [-6.29, 53.35],
      [-6.3, 53.35],
      [-6.3, 53.34],
    ],
  ],
};

describe("adminDivisionAvailability", () => {
  it("treats counts under 2 as unavailable", () => {
    expect(isAdminDivisionCountAvailable(0)).toBe(false);
    expect(isAdminDivisionCountAvailable(1)).toBe(false);
    expect(isAdminDivisionCountAvailable(2)).toBe(true);
  });

  it("is available only for ok status with enough divisions", () => {
    const counts = okAdminDivisionCounts({
      admin_division_3: 4,
      admin_division_4: 11,
      admin_division_2: 1,
    });

    expect(isAdminDivisionCategoryAvailable("admin_division_3", counts)).toBe(true);
    expect(isAdminDivisionCategoryAvailable("admin_division_4", counts)).toBe(true);
    expect(isAdminDivisionCategoryAvailable("admin_division_2", counts)).toBe(false);
    expect(isAdminDivisionCategoryAvailable("commercial_airport", counts)).toBe(true);
  });

  it("hides pending and error from availability", () => {
    expect(isAdminDivisionCategoryAvailable("admin_division_3", null)).toBe(false);
    expect(isAdminDivisionCategoryAvailable("admin_division_3", undefined)).toBe(false);

    const failed = okAdminDivisionCounts({ admin_division_3: 4 });
    failed.admin_division_3 = { status: "error" };
    expect(isAdminDivisionCategoryAvailable("admin_division_3", failed)).toBe(false);
  });

  it("lists error categories but not pending or sparse ok", () => {
    const pending = emptyAdminDivisionCounts();
    expect(isAdminDivisionCategoryListed("admin_division_3", pending)).toBe(false);

    const sparse = okAdminDivisionCounts({ admin_division_3: 1 });
    expect(isAdminDivisionCategoryListed("admin_division_3", sparse)).toBe(false);

    const failed = okAdminDivisionCounts({ admin_division_3: 4 });
    failed.admin_division_3 = { status: "error" };
    expect(isAdminDivisionCategoryListed("admin_division_3", failed)).toBe(true);
    expect(isAdminDivisionCategoryProbeFailed("admin_division_3", failed)).toBe(true);
  });

  it("respects region-pack matching blocks", () => {
    const counts = okAdminDivisionCounts({
      admin_division_1: 4,
      admin_division_2: 4,
      admin_division_3: 4,
      admin_division_4: 11,
    });

    expect(isAdminDivisionCategoryAvailable("admin_division_1", counts, "dublin")).toBe(false);
    expect(isAdminDivisionCategoryAvailable("admin_division_2", counts, "dublin")).toBe(false);
    expect(isAdminDivisionCategoryAvailable("admin_division_3", counts, "dublin")).toBe(true);
    expect(isAdminDivisionCategoryListed("admin_division_1", counts, "dublin")).toBe(false);
  });

  it("probe stores error per level on fetch failure", async () => {
    vi.spyOn(adminDivisionBoundaries, "fetchAdminDivisionFeaturesInArea").mockImplementation(
      async (_gameArea, level) => {
        if (level === 8) {
          throw new Error("overpass down");
        }
        return [{ id: "a" }, { id: "b" }] as never;
      },
    );

    const counts = await probeAdminDivisionCounts(sampleGameArea);
    expect(counts.admin_division_3).toEqual({ status: "error" });
    expect(counts.admin_division_1).toEqual({ status: "ok", count: 2 });
  });

  it("measuring border probe failure mirrors matching category", () => {
    const failed = allAdminDivisionLevelsError();
    expect(isMeasuringAdminBorderProbeFailed("admin3_border", failed)).toBe(true);
    expect(isMeasuringAdminBorderListed("admin3_border", failed)).toBe(true);
    expect(isMeasuringAdminBorderProbeFailed("museum", failed)).toBe(false);
  });

  it("adminBoundaryLevelsForSession skips unavailable and error levels", () => {
    const counts = okAdminDivisionCounts({
      admin_division_1: 2,
      admin_division_2: 1,
      admin_division_3: 4,
      admin_division_4: 7,
    });
    counts.admin_division_2 = { status: "error" };

    expect(adminBoundaryLevelsForSession(undefined, undefined, counts)).toEqual([4, 8, 9]);
  });

  it("okAdminDivisionCounts fills only provided categories", () => {
    const partial = okAdminDivisionCounts({ admin_division_3: 17, admin_division_4: 11 });
    expect(partial.admin_division_3).toEqual({ status: "ok", count: 17 });
    expect(partial.admin_division_1).toBeNull();
  });

  it("southampton hides blocked admin division 4 even with high counts", () => {
    const counts = okAdminDivisionCounts({
      admin_division_3: 17,
      admin_division_4: 11,
    });
    expect(isAdminDivisionCategoryAvailable("admin_division_3", counts, "southampton")).toBe(true);
    expect(isAdminDivisionCategoryAvailable("admin_division_4", counts, "southampton")).toBe(false);
  });

  it("australia exposes all admin levels when counts are sufficient", () => {
    const counts = okAdminDivisionCounts({
      admin_division_1: 4,
      admin_division_2: 4,
      admin_division_3: 8,
      admin_division_4: 11,
    });
    expect(isAdminDivisionCategoryAvailable("admin_division_1", counts, "australia")).toBe(true);
    expect(isAdminDivisionCategoryAvailable("admin_division_2", counts, "australia")).toBe(true);
    expect(isAdminDivisionCategoryAvailable("admin_division_3", counts, "australia")).toBe(true);
    expect(isAdminDivisionCategoryAvailable("admin_division_4", counts, "australia")).toBe(true);
  });
});
