import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAP_CHROME_DOCKS_STORAGE_KEY,
  MAP_SIDE_DOCK_STORAGE_KEY,
} from "@/hooks/map/mapChromeDockPlacement";
import { MapSideDockStack } from "./MapSideDockStack";

describe("MapSideDockStack", () => {
  beforeEach(() => {
    localStorage.removeItem(MAP_SIDE_DOCK_STORAGE_KEY);
    localStorage.removeItem(MAP_CHROME_DOCKS_STORAGE_KEY);
    delete document.documentElement.dataset.mapSideDock;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 300,
      y: 500,
      top: 500,
      left: 300,
      bottom: 700,
      right: 352,
      width: 52,
      height: 200,
      toJSON() {
        return {};
      },
    });
  });

  it("has no grabber and exposes a fixed stack", () => {
    const { container } = render(
      <MapSideDockStack>
        <button type="button">Chat</button>
      </MapSideDockStack>,
    );
    const stack = container.querySelector('[data-testid="map-side-dock-stack"]');
    expect(stack?.className).toMatch(/jl-map-chrome-side-stack--fixed/);
    expect(stack?.getAttribute("data-side")).toBe("right");
    expect(container.querySelector("[data-side-dock-handle]")).toBeNull();
    expect(
      screen.getByRole("group", { name: /Session tools\. Drag to reposition/i }),
    ).toBeInTheDocument();
  });

  it("cycles placement with keyboard on the stack", () => {
    render(
      <MapSideDockStack>
        <button type="button">Chat</button>
      </MapSideDockStack>,
    );
    const stack = screen.getByRole("group", {
      name: /Session tools\. Drag to reposition/i,
    });
    fireEvent.keyDown(stack, { key: "Enter" });
    expect(stack.getAttribute("data-side")).toBe("right");
    fireEvent.keyDown(stack, { key: "Enter" });
    expect(document.documentElement.dataset.mapSideDock).toMatch(/left$/);
  });

  it("snaps to left when released near the left edge", () => {
    const { container } = render(
      <MapSideDockStack>
        <button type="button">Chat</button>
      </MapSideDockStack>,
    );
    const stack = container.querySelector('[data-testid="map-side-dock-stack"]') as HTMLElement;
    const tool = screen.getByRole("button", { name: "Chat" });

    fireEvent.pointerDown(tool, {
      pointerId: 1,
      button: 0,
      clientX: 320,
      clientY: 600,
    });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 300, clientY: 580 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 8,
      y: 300,
      top: 300,
      left: 8,
      bottom: 500,
      right: 60,
      width: 52,
      height: 200,
      toJSON() {
        return {};
      },
    });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 40, clientY: 400 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 40, clientY: 400 });

    expect(stack.getAttribute("data-side")).toBe("left");
  });
});
