import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { stopMapCameraEase } from "./stopMapCameraEase";

describe("stopMapCameraEase", () => {
  it("cancels camera ease without calling map.stop (handler reset)", () => {
    const cameraStop = vi.fn();
    const mapStop = vi.fn();
    const map = {
      _camera: { stop: cameraStop },
      stop: mapStop,
      isEasing: () => true,
    } as unknown as MapLibreMap;

    stopMapCameraEase(map);

    expect(cameraStop).toHaveBeenCalledWith(true);
    expect(mapStop).not.toHaveBeenCalled();
  });

  it("falls back to map.stop only when camera.stop is unavailable", () => {
    const mapStop = vi.fn();
    const map = {
      stop: mapStop,
      isEasing: () => true,
    } as unknown as MapLibreMap;

    stopMapCameraEase(map);

    expect(mapStop).toHaveBeenCalledTimes(1);
  });

  it("does not call map.stop when not easing and camera is missing", () => {
    const mapStop = vi.fn();
    const map = {
      stop: mapStop,
      isEasing: () => false,
    } as unknown as MapLibreMap;

    stopMapCameraEase(map);

    expect(mapStop).not.toHaveBeenCalled();
  });
});
