import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useMotionProfile } from "./useMotionProfile";
import { useMapStore } from "../../state/mapStore";
import { resetAllStores } from "../../test/helpers/storeReset";

describe("useMotionProfile", () => {
  beforeEach(() => {
    resetAllStores();
    document.documentElement.removeAttribute("data-motion");
  });

  it("sets reduced motion when low power mode is enabled", () => {
    useMapStore.getState().setLowPowerMode(true);

    const { result } = renderHook(() => useMotionProfile());

    expect(result.current.animate).toBe(false);
    expect(document.documentElement.dataset.motion).toBe("reduced");
  });

  it("sets full motion when low power mode is disabled", () => {
    const { result } = renderHook(() => useMotionProfile());

    expect(result.current.animate).toBe(true);
    expect(document.documentElement.dataset.motion).toBe("full");
  });

  it("keeps data-motion reduced when one of multiple hooks unmounts with low power on", () => {
    useMapStore.getState().setLowPowerMode(true);

    const first = renderHook(() => useMotionProfile());
    const second = renderHook(() => useMotionProfile());

    expect(document.documentElement.dataset.motion).toBe("reduced");

    first.unmount();

    expect(document.documentElement.dataset.motion).toBe("reduced");

    second.unmount();
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });
});
