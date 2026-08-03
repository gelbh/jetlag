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
  alreadyExistsThrows: number;
};

function createMockMap(): MockMap {
  const images = new Set<string>();
  const addImageCalls: string[] = [];
  const state = { alreadyExistsThrows: 0 };
  return {
    images,
    addImageCalls,
    get alreadyExistsThrows() {
      return state.alreadyExistsThrows;
    },
    hasImage: (id) => images.has(id),
    addImage: (id) => {
      // Match MapLibre: second addImage for the same id throws.
      if (images.has(id)) {
        state.alreadyExistsThrows += 1;
        throw new Error(`An image named "${id}" already exists.`);
      }
      images.add(id);
      addImageCalls.push(id);
    },
  };
}

/**
 * Delayed decode so two overlapping registers can both pass the initial
 * hasImage check before either addImage runs (production race).
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

  it("does not throw when concurrent registerMapLibreMarkerImages race on duplicate ids", async () => {
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
    // Without re-check + serialize, overlapping Promise.all registers hit
    // MapLibre "already exists" (caught as load failure / console noise).
    expect(mock.alreadyExistsThrows).toBe(0);
    expect(new Set(mock.addImageCalls).size).toBe(mock.addImageCalls.length);
  });
});
