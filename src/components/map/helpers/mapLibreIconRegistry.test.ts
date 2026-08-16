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
  style: object | undefined;
  isStyleLoaded: () => boolean;
  _removed: boolean;
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
    style: {},
    isStyleLoaded: () => true,
    _removed: false,
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

  it("skips register when map style is undefined without calling hasImage", async () => {
    const hasImage = vi.fn(() => {
      throw new TypeError(
        "Cannot read properties of undefined (reading 'getImage')",
      );
    });
    const addImage = vi.fn();
    const map = {
      hasImage,
      addImage,
      isStyleLoaded: () => false,
      style: undefined,
      _removed: false,
    } as unknown as MapLibreMap;

    await expect(registerMapLibreMarkerImages(map)).resolves.toBeUndefined();
    expect(hasImage).not.toHaveBeenCalled();
    expect(addImage).not.toHaveBeenCalled();
  });

  it("skips register when map was removed", async () => {
    const hasImage = vi.fn(() => {
      throw new TypeError(
        "Cannot read properties of undefined (reading 'getImage')",
      );
    });
    const addImage = vi.fn();
    const map = {
      hasImage,
      addImage,
      isStyleLoaded: () => true,
      style: {},
      _removed: true,
    } as unknown as MapLibreMap;

    await expect(registerMapLibreMarkerImages(map)).resolves.toBeUndefined();
    expect(hasImage).not.toHaveBeenCalled();
    expect(addImage).not.toHaveBeenCalled();
  });

  it("skips addImage when style tears down during SVG decode", async () => {
    const images = new Set<string>();
    let styleAvailable = true;
    const hasImage = vi.fn((id: string) => {
      if (!styleAvailable) {
        throw new TypeError(
          "Cannot read properties of undefined (reading 'getImage')",
        );
      }
      return images.has(id);
    });
    const addImage = vi.fn((id: string) => {
      if (!styleAvailable) {
        throw new TypeError(
          "Cannot read properties of undefined (reading 'addImage')",
        );
      }
      images.add(id);
    });
    const map = {
      hasImage,
      addImage,
      isStyleLoaded: () => styleAvailable,
      get style() {
        return styleAvailable ? {} : undefined;
      },
      _removed: false,
    } as unknown as MapLibreMap;

    await withDelayedMockImage(async () => {
      const pending = registerMapLibreMarkerImages(map);
      styleAvailable = false;
      await expect(pending).resolves.toBeUndefined();
    });

    expect(addImage).not.toHaveBeenCalled();
  });

  it("swallows hasImage getImage throw when style races mid-register (JETLAG-3H)", async () => {
    const hasImage = vi.fn(() => {
      throw new TypeError(
        "Cannot read properties of undefined (reading 'getImage')",
      );
    });
    const addImage = vi.fn();
    const map = {
      hasImage,
      addImage,
      isStyleLoaded: () => true,
      style: {},
      _removed: false,
    } as unknown as MapLibreMap;

    await withDelayedMockImage(async () => {
      await expect(registerMapLibreMarkerImages(map)).resolves.toBeUndefined();
    });
    expect(hasImage).toHaveBeenCalled();
    expect(addImage).not.toHaveBeenCalled();
  });
});
