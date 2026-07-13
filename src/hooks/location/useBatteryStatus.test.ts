// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBatteryStatus } from "./useBatteryStatus";

describe("useBatteryStatus", () => {
  it("publishes battery level without listeners when addEventListener is missing", async () => {
    const battery = {
      level: 0.42,
      charging: false,
    };

    vi.stubGlobal("navigator", {
      getBattery: vi.fn(async () => battery),
    });

    const { result } = renderHook(() => useBatteryStatus());

    await waitFor(() => {
      expect(result.current.supported).toBe(true);
    });

    expect(result.current.level).toBe(0.42);
    expect(result.current.charging).toBe(false);
  });

  it("subscribes to level and charging changes when supported", async () => {
    const listeners = new Map<string, () => void>();
    const battery = {
      level: 0.8,
      charging: true,
      addEventListener: vi.fn((type: string, listener: () => void) => {
        listeners.set(type, listener);
      }),
      removeEventListener: vi.fn((type: string) => {
        listeners.delete(type);
      }),
    };

    vi.stubGlobal("navigator", {
      getBattery: vi.fn(async () => battery),
    });

    const { result, unmount } = renderHook(() => useBatteryStatus());

    await waitFor(() => {
      expect(result.current.level).toBe(0.8);
    });

    expect(battery.addEventListener).toHaveBeenCalledWith(
      "levelchange",
      expect.any(Function),
    );
    expect(battery.addEventListener).toHaveBeenCalledWith(
      "chargingchange",
      expect.any(Function),
    );

    unmount();

    expect(battery.removeEventListener).toHaveBeenCalledWith(
      "levelchange",
      expect.any(Function),
    );
    expect(battery.removeEventListener).toHaveBeenCalledWith(
      "chargingchange",
      expect.any(Function),
    );
  });
});
