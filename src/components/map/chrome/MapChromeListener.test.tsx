import { render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapChromeListener } from "./MapChromeListener";

const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

const mapMock = {
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    const set = handlers.get(event) ?? new Set();
    set.add(handler);
    handlers.set(event, set);
  }),
  off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    handlers.get(event)?.delete(handler);
  }),
};

vi.mock("../helpers/useMapLibreMap", () => ({
  useMapLibreMap: () => mapMock,
}));

function emit(event: string) {
  for (const handler of handlers.get(event) ?? []) {
    handler();
  }
}

describe("MapChromeListener", () => {
  afterEach(() => {
    handlers.clear();
    mapMock.on.mockClear();
    mapMock.off.mockClear();
  });

  it("sets data-map-interacting on the HUD so three-zone docks can hide on pan", () => {
    const chromeHudRef = createRef<HTMLDivElement>();
    const hud = document.createElement("div");
    hud.className = "map-chrome-hud";
    chromeHudRef.current = hud;
    document.body.appendChild(hud);

    const { unmount } = render(<MapChromeListener chromeHudRef={chromeHudRef} />);

    emit("dragstart");
    expect(hud.dataset.mapInteracting).toBe("true");

    emit("dragend");
    emit("moveend");
    expect(hud.dataset.mapInteracting).toBeUndefined();

    unmount();
    hud.remove();
  });
});
