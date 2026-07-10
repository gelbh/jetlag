import { describe, expect, it } from "vitest";
import { applyRegionPackMatchingLabels } from "./regionPackLabels";
import { getMatchingCategory } from "../questions/matchingQuestions";
import { applyRegionPackMeasuringLabels } from "./regionPackLabels";
import { MEASURING_CATALOG } from "../questions/measuringQuestions";

describe("regionPackLabels", () => {
  it("applies Dublin labels to local authority and LEA categories", () => {
    const authority = applyRegionPackMatchingLabels(
      getMatchingCategory("admin_division_3"),
      "dublin",
    );
    const lea = applyRegionPackMatchingLabels(
      getMatchingCategory("admin_division_4"),
      "dublin",
    );

    expect(authority.label).toBe("Local Authority");
    expect(lea.label).toBe("Local Electoral Area");
  });

  it("applies Dublin labels to admin border measuring options", () => {
    const admin3 = applyRegionPackMeasuringLabels(
      MEASURING_CATALOG.find((option) => option.id === "admin3_border")!,
      "dublin",
    );
    const admin4 = applyRegionPackMeasuringLabels(
      MEASURING_CATALOG.find((option) => option.id === "admin4_border")!,
      "dublin",
    );

    expect(admin3.label).toBe("Local authority border");
    expect(admin4.label).toBe("Local electoral area border");
  });
});
