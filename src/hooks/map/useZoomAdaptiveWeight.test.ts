import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (event?: unknown) => void;

function createMapMock(initialZoom: number) {
  const handlers = new Map<string, Set<Handler>>();
  let zoom = initialZoom;

  return {
    getZoom: () => zoom,
    setZoomForTest(next: number) {
      zoom = next;
    },
    on(type: string, handler: Handler) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(handler);
    },
    off(type: string, handler: Handler) {
      handlers.get(type)?.delete(handler);
    },
    fire(type: string) {
      for (const handler of handlers.get(type) ?? []) {
        handler({});
      }
    },
  };
}

const mapRef: { current: ReturnType<typeof createMapMock> } = {
  current: createMapMock(12),
};

vi.mock("react-leaflet", () => ({
  useMap: () => mapRef.current,
}));

describe("useZoomCssScale", () => {
  beforeEach(() => {
    mapRef.current = createMapMock(12);
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      },
    );
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ~2 mid-zoom and resets to 1 after zoomend", async () => {
    const { useZoomCssScale } = await import("./useZoomCssScale");
    const { result } = renderHook(() => useZoomCssScale());

    expect(result.current).toBe(1);

    await act(() => {
      mapRef.current.setZoomForTest(13);
      mapRef.current.fire("zoom");
    });
    expect(result.current).toBe(2);

    await act(() => {
      mapRef.current.fire("zoomend");
    });
    expect(result.current).toBe(1);
  });
});

describe("useZoomAdaptiveWeight", () => {
  beforeEach(() => {
    mapRef.current = createMapMock(12);
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      },
    );
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates quantized weight on live zoom, not only zoomend", async () => {
    const { useZoomAdaptiveWeight } = await import("./useZoomAdaptiveWeight");
    const { result } = renderHook(() => useZoomAdaptiveWeight(2));

    expect(result.current).toBe(2);

    await act(() => {
      mapRef.current.setZoomForTest(4);
      mapRef.current.fire("zoom");
    });

    expect(result.current).toBeLessThan(2);
  });
});

describe("useCompensatedZoomAdaptiveWeight", () => {
  beforeEach(() => {
    mapRef.current = createMapMock(12);
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      },
    );
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("inverse-scales logical weight while CSS zoom scale is active", async () => {
    const { useCompensatedZoomAdaptiveWeight } = await import(
      "./useZoomAdaptiveWeight"
    );
    const { result } = renderHook(() => useCompensatedZoomAdaptiveWeight(2));

    await act(() => {
      mapRef.current.setZoomForTest(13);
      mapRef.current.fire("zoom");
    });

    expect(result.current).toBeCloseTo(1, 5);
  });
});
