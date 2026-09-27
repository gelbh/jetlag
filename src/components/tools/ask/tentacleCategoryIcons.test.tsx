import { describe, expect, it } from "vitest";
import { Bank, BookOpen, Train } from "@phosphor-icons/react";
import { tentacleCategoryIcon } from "./tentacleCategoryIcons";

describe("tentacleCategoryIcon", () => {
  it("maps shared POI types to Matching glyphs", () => {
    expect(tentacleCategoryIcon("museum")).toBe(Bank);
    expect(tentacleCategoryIcon("library")).toBe(BookOpen);
  });

  it("maps metro_line to Train", () => {
    expect(tentacleCategoryIcon("metro_line")).toBe(Train);
  });
});
