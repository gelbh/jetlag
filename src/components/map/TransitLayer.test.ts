import { describe, expect, it } from "vitest";
import {
  getTransitStopIcon,
  getTransitVehicleIcon,
} from "./TransitLayer";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

describe("TransitLayer icon helpers", () => {
  it("reuses stable stop icons by mode", () => {
    expect(getTransitStopIcon("metro")).toBe(getTransitStopIcon("metro"));
    expect(getTransitStopIcon("bus")).not.toBe(getTransitStopIcon("rail"));
  });

  it("caches vehicle icons by rounded bearing and color", () => {
    const color = MAP_ANNOTATION_COLORS.transit.bus;
    const a = getTransitVehicleIcon(1, color);
    const b = getTransitVehicleIcon(7, color);
    const c = getTransitVehicleIcon(20, color);

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
