import { afterEach, describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  JL_ICON_USER_LOCATION,
  registerMapLibreMarkerImages,
  transitModeIconId,
  transitVehicleIconId,
} from "./mapLibreIconRegistry";

type MockMap = {
  hasImage: (id: string) => boolean;
  addImage: (id: string, _image: unknown, _opts?: unknown) => void;
  images: Set<string>;
  addImageCalls: string[];
  duplicateAddAttempts: number;
};

function createMockMap(): MockMap {
  const images = new Set<string>();
  const addImageCalls: string[] = [];
  const state = { duplicateAddAttempts: 0 };
  return {
    images,
    addImageCalls,
    get duplicateAddAttempts() {
      return state.duplicateAddAttempts;
    },
    hasImage: (id) => images.has(id),
    addImage: (id) => {
      // MapLibre 6.x: duplicate addImage fires an error event and returns
      // (does not throw). Count the bad call; do not add again.
      if (images.has(id)) {
        state.duplicateAddAttempts += 1;
        return;
      }
      images.add(id);
      addImageCalls.push(id);
    },
  };
}

/**
 * Delayed decode so overlapping work can pass the initial hasImage check
 * before either addImage runs (production race shape).
 */
function withDelayedMockImage(run: () => Promise<void>) {
  const originalImage = globalThis.Image;
  class DelayedMockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }
  globalThis.Image = DelayedMockImage as unknown as typeof Image;
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-icon");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  return run().finally(() => {
    globalThis.Image = originalImage;
  });
}

describe("mapLibreIconRegistry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes concurrent registerMapLibreMarkerImages without duplicate addImage", async () => {
    // Production stack: mapLibreIconRegistry → addImage → Promise.all
    // (transit mode indices) when style.load overlaps mount register.
    const mock = createMockMap();
    const map = mock as unknown as MapLibreMap;

    await withDelayedMockImage(async () => {
      await Promise.all([
        registerMapLibreMarkerImages(map),
        registerMapLibreMarkerImages(map),
      ]);
    });

    expect(mock.hasImage(JL_ICON_USER_LOCATION)).toBe(true);
    expect(mock.hasImage(transitModeIconId("rail"))).toBe(true);
    expect(mock.hasImage(transitVehicleIconId("bus"))).toBe(true);
    // Per-map registerInFlight queue is the control; duplicate addImage would
    // be MapLibre console noise (error event), not a throw.
    expect(mock.duplicateAddAttempts).toBe(0);
    expect(new Set(mock.addImageCalls).size).toBe(mock.addImageCalls.length);
  });
});
