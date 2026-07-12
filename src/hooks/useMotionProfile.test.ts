import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useMotionProfile } from "./useMotionProfile";
import { useMapStore } from "../state/mapStore";
import { resetAllStores } from "../test/helpers/storeReset";

describe("useMotionProfile", () => {
  beforeEach(() => {
    resetAllStores();
  });

  it("keeps animate true when low power mode is enabled", () => {
    useMapStore.getState().setLowPowerMode(true);

    const { result } = renderHook(() => useMotionProfile());

    expect(result.current.animate).toBe(true);
    expect(result.current.decorativeAnimate).toBe(false);
  });

  it("returns decorative animate true when low power mode is disabled", () => {
    const { result } = renderHook(() => useMotionProfile());

    expect(result.current.animate).toBe(true);
    expect(result.current.decorativeAnimate).toBe(true);
  });
});
