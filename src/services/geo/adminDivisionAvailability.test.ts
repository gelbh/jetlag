import { describe, expect, it } from "vitest";
import {
  emptyAdminDivisionCounts,
  isAdminDivisionCategoryAvailable,
  isAdminDivisionCountAvailable,
  isMeasuringAdminBorderKind,
  adminBorderKindAvailability,
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

  it("mirrors matching availability for measuring admin border kinds", () => {
    const counts = {
      ...emptyAdminDivisionCounts(),
      admin_division_3: 1,
      admin_division_4: 7,
    };

    expect(isMeasuringAdminBorderKind("admin3_border")).toBe(true);
    expect(adminBorderKindAvailability("admin3_border", counts)).toBe(false);
    expect(adminBorderKindAvailability("admin4_border", counts)).toBe(true);
    expect(adminBorderKindAvailability("rail_station", counts)).toBe(true);
  });
});
