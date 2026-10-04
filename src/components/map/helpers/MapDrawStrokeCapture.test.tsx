import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapDrawStrokeCapture } from "./MapDrawStrokeCapture";

const dragPan = {
  enable: vi.fn(),
  disable: vi.fn(),
};

const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

function on(type: string, handler: (...args: unknown[]) => void) {
  const set = listeners.get(type) ?? new Set();
  set.add(handler);
  listeners.set(type, set);
}

function off(type: string, handler: (...args: unknown[]) => void) {
  listeners.get(type)?.delete(handler);
}

function emit(type: string, event: unknown) {
  for (const handler of listeners.get(type) ?? []) {
    handler(event);
  }
}

const mapRef = {
  on,
  off,
  getMap: () => ({ dragPan }),
  // Intentionally no top-level dragPan - matches react-map-gl MapRef runtime.
};

vi.mock("../helpers/useMapLibreMap", () => ({
  useMapLibreMap: () => mapRef,
}));

describe("MapDrawStrokeCapture", () => {
  afterEach(() => {
    cleanup();
    listeners.clear();
    dragPan.enable.mockClear();
    dragPan.disable.mockClear();
  });

  it("disables and enables dragPan via getMap() during a stroke", () => {
    const onBegin = vi.fn();
    const onExtend = vi.fn();
    const onEnd = vi.fn();

    render(<MapDrawStrokeCapture enabled onBegin={onBegin} onExtend={onExtend} onEnd={onEnd} />);

    emit("touchstart", {
      points: [{}],
      lngLat: { lat: 53.3, lng: -6.2 },
    });
    expect(dragPan.disable).toHaveBeenCalledTimes(1);
    expect(onBegin).toHaveBeenCalledWith(53.3, -6.2);

    emit("touchend", {});
    expect(dragPan.enable).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
