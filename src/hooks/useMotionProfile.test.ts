import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useMotionProfile } from "./useMotionProfile";
import { useMapStore } from "../state/mapStore";
import { resetAllStores } from "../test/helpers/storeReset";

describe("useMotionProfile", () => {
  beforeEach(() => {
    resetAllStores();
  });

  it("returns animate false when low power mode is enabled", () => {
    useMapStore.getState().setLowPowerMode(true);

    const { result } = renderHook(() => useMotionProfile());

    expect(result.current.animate).toBe(false);
  });

  it("returns animate true when low power mode is disabled", () => {
    const { result } = renderHook(() => useMotionProfile());

    expect(result.current.animate).toBe(true);
  });
});
