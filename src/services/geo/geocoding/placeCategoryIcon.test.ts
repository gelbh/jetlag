import {
  BuildingsIcon,
  CityIcon,
  FlagIcon,
  HouseIcon,
  MapPinIcon,
  MapTrifoldIcon,
} from "@phosphor-icons/react";
import { describe, expect, it } from "vitest";
import { placeCategoryIcon } from "./placeCategoryIcon";

describe("placeCategoryIcon", () => {
  it("maps settlement and admin types to phosphor glyphs", () => {
    expect(placeCategoryIcon("city")).toBe(CityIcon);
    expect(placeCategoryIcon("municipality")).toBe(CityIcon);
    expect(placeCategoryIcon("town")).toBe(BuildingsIcon);
    expect(placeCategoryIcon("village")).toBe(HouseIcon);
    expect(placeCategoryIcon("county")).toBe(MapTrifoldIcon);
    expect(placeCategoryIcon("state")).toBe(MapTrifoldIcon);
    expect(placeCategoryIcon("country")).toBe(FlagIcon);
    expect(placeCategoryIcon("administrative area")).toBe(MapTrifoldIcon);
  });

  it("falls back to a map pin for unknown types", () => {
    expect(placeCategoryIcon("peak")).toBe(MapPinIcon);
    expect(placeCategoryIcon("")).toBe(MapPinIcon);
  });
});
