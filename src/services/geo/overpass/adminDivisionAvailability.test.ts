import { describe, expect, it } from "vitest";
import {
  adminBorderKindAvailability,
  adminBoundaryLevelsForSession,
  emptyAdminDivisionCounts,
  isAdminDivisionCategoryAvailable,
  isAdminDivisionCountAvailable,
  isMeasuringAdminBorderKind,
} from "./adminDivisionAvailability";

describe("adminDivisionAvailability", () => {
  it("requires at least two divisions before showing admin categories", () => {
    expect(isAdminDivisionCountAvailable(0)).toBe(false);
    expect(isAdminDivisionCountAvailable(1)).toBe(false);
    expect(isAdminDivisionCountAvailable(2)).toBe(true);
  });

  it("hides admin division matching categories below the threshold", () => {
    const counts = {
      ...emptyAdminDivisionCounts(),
      admin_division_3: 4,
      admin_division_4: 11,
    };

    expect(
      isAdminDivisionCategoryAvailable("admin_division_3", counts),
    ).toBe(true);
    expect(
      isAdminDivisionCategoryAvailable("admin_division_4", counts),
    ).toBe(true);
    expect(
      isAdminDivisionCategoryAvailable("admin_division_2", counts),
    ).toBe(false);
    expect(
      isAdminDivisionCategoryAvailable("commercial_airport", counts),
    ).toBe(true);
  });

  it("hides admin categories while preload counts are pending", () => {
    expect(
      isAdminDivisionCategoryAvailable("admin_division_3", null),
    ).toBe(false);
    expect(
      isAdminDivisionCategoryAvailable("admin_division_3", undefined),
    ).toBe(false);
  });

  it("hides first- and second-level admin options for Dublin region packs", () => {
    const counts = {
      ...emptyAdminDivisionCounts(),
      admin_division_1: 4,
      admin_division_2: 4,
      admin_division_3: 4,
      admin_division_4: 11,
    };

    expect(
      isAdminDivisionCategoryAvailable("admin_division_1", counts, "dublin"),
    ).toBe(false);
    expect(
      isAdminDivisionCategoryAvailable("admin_division_2", counts, "dublin"),
    ).toBe(false);
    expect(
      isAdminDivisionCategoryAvailable("admin_division_3", counts, "dublin"),
    ).toBe(true);
    expect(adminBorderKindAvailability("admin1_border", counts, "dublin")).toBe(
      false,
    );
    expect(adminBorderKindAvailability("admin2_border", counts, "dublin")).toBe(
      false,
    );
    expect(adminBorderKindAvailability("admin3_border", counts, "dublin")).toBe(
      true,
    );
  });

  it("returns only Dublin region-pack admin levels for boundary layer", () => {
    const counts = {
      ...emptyAdminDivisionCounts(),
      admin_division_1: 5,
      admin_division_2: 5,
      admin_division_3: 4,
      admin_division_4: 31,
    };

    expect(
      adminBoundaryLevelsForSession("dublin", { 8: "{}", 9: "{}" }, counts),
    ).toEqual([8, 9]);
    expect(
      adminBoundaryLevelsForSession("dublin", { 8: "{}" }, counts),
    ).toEqual([8]);
  });

  it("mirrors matching availability for measuring admin border kinds", () => {
    const counts = {
      ...emptyAdminDivisionCounts(),
      admin_division_1: 2,
      admin_division_2: 1,
      admin_division_3: 1,
      admin_division_4: 7,
    };

    expect(isMeasuringAdminBorderKind("admin3_border")).toBe(true);
    expect(adminBorderKindAvailability("admin1_border", counts)).toBe(true);
    expect(adminBorderKindAvailability("admin2_border", counts)).toBe(false);
    expect(adminBorderKindAvailability("admin3_border", counts)).toBe(false);
    expect(adminBorderKindAvailability("admin4_border", counts)).toBe(true);
    expect(adminBorderKindAvailability("rail_station", counts)).toBe(true);
  });
});
