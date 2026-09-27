import { describe, expect, it } from "vitest";
import type { MapScreenChromeProps } from "./MapScreenChrome";
import type { MapScreenMapLayersProps } from "./MapScreenMapLayers";
import type { HiderMapScreenChromeProps } from "../hider-map-screen/HiderMapScreenChrome";

describe("map chrome controller prop shapes (W3-D2)", () => {
  it("MapScreenChrome accepts only controller + optional mapSlot", () => {
    type Keys = keyof MapScreenChromeProps;
    const keys: Keys[] = ["controller", "mapSlot"];
    expect(keys).toEqual(["controller", "mapSlot"]);

    type Extra = Exclude<Keys, "controller" | "mapSlot">;
    const noExtra: Extra extends never ? true : false = true;
    expect(noExtra).toBe(true);
  });

  it("MapScreenMapLayers accepts only controller", () => {
    type Keys = keyof MapScreenMapLayersProps;
    const keys: Keys[] = ["controller"];
    expect(keys).toEqual(["controller"]);

    type Extra = Exclude<Keys, "controller">;
    const noExtra: Extra extends never ? true : false = true;
    expect(noExtra).toBe(true);
  });

  it("HiderMapScreenChrome accepts only controller + optional mapSlot", () => {
    type Keys = keyof HiderMapScreenChromeProps;
    const keys: Keys[] = ["controller", "mapSlot"];
    expect(keys).toEqual(["controller", "mapSlot"]);

    type Extra = Exclude<Keys, "controller" | "mapSlot">;
    const noExtra: Extra extends never ? true : false = true;
    expect(noExtra).toBe(true);
  });
});
