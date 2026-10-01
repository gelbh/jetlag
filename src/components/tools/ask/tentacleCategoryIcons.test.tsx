import { describe, expect, it } from "vitest";
import { BankIcon, BookOpenIcon, TrainIcon } from "@phosphor-icons/react";
import { tentacleCategoryIcon } from "./tentacleCategoryIcons";

describe("tentacleCategoryIcon", () => {
  it("maps shared POI types to Matching glyphs", () => {
    expect(tentacleCategoryIcon("museum")).toBe(BankIcon);
    expect(tentacleCategoryIcon("library")).toBe(BookOpenIcon);
  });

  it("maps metro_line to TrainIcon", () => {
    expect(tentacleCategoryIcon("metro_line")).toBe(TrainIcon);
  });
});
