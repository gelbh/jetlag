import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapCompassControl } from "./MapCompassControl";

const listeners = new Map<string, Set<() => void>>();

const mapMock = {
  getContainer: () => document.body,
  getBearing: vi.fn(() => 45),
  on: vi.fn((event: string, handler: () => void) => {
    const set = listeners.get(event) ?? new Set();
    set.add(handler);
    listeners.set(event, set);
  }),
  off: vi.fn((event: string, handler: () => void) => {
    listeners.get(event)?.delete(handler);
  }),
};

vi.mock("../helpers/useMapLibreMap", () => ({
  useMapLibreMap: () => mapMock,
  useMapLibreInteracting: () => false,
}));

describe("MapCompassControl", () => {
  beforeEach(() => {
    listeners.clear();
    mapMock.getBearing.mockReturnValue(45);
    mapMock.on.mockClear();
    mapMock.off.mockClear();
  });

  it("renders a compass that notifies MapFocus via onResetCamera only", () => {
    const onResetCamera = vi.fn();
    render(
      <MapCompassControl enabled inset="dock" onResetCamera={onResetCamera} />,
    );

    const button = screen.getByRole("button", {
      name: "Reset map orientation and view",
    });
    const needle = button.querySelector(".map-compass-control__needle");
    expect(needle).toHaveStyle({ transform: "rotate(-45deg)" });
    expect(mapMock.on).toHaveBeenCalledWith("rotate", expect.any(Function));
    expect(mapMock.on).not.toHaveBeenCalledWith("move", expect.any(Function));

    fireEvent.click(button);
    expect(onResetCamera).toHaveBeenCalledTimes(1);
  });

  it("hides when disabled", () => {
    render(<MapCompassControl enabled={false} onResetCamera={vi.fn()} />);
    expect(
      screen.queryByRole("button", {
        name: "Reset map orientation and view",
      }),
    ).toBeNull();
  });
});
