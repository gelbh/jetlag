import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { MapDraggableFixedStack } from "./MapDraggableFixedStack";
import {
  MAP_CHROME_DOCKS_STORAGE_KEY,
  MAP_NAV_DOCK_STORAGE_KEY,
  type MapChromeDockPlacement,
} from "@/hooks/map/mapChromeDockPlacement";

function Harness({
  initial = { side: "left", topRatio: 0.72 } satisfies MapChromeDockPlacement,
}: {
  initial?: MapChromeDockPlacement;
}) {
  const [placement, setPlacement] = useState(initial);
  return (
    <MapDraggableFixedStack
      placement={placement}
      setPlacement={setPlacement}
      testId="map-nav-dock-stack"
      ariaLabel="Map controls. Drag to reposition."
      chromeRole="nav"
    >
      <button type="button">Zoom</button>
    </MapDraggableFixedStack>
  );
}

describe("MapDraggableFixedStack (nav)", () => {
  beforeEach(() => {
    localStorage.removeItem(MAP_NAV_DOCK_STORAGE_KEY);
    localStorage.removeItem(MAP_CHROME_DOCKS_STORAGE_KEY);
    delete document.documentElement.dataset.mapNavDock;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 8,
      y: 500,
      top: 500,
      left: 8,
      bottom: 700,
      right: 60,
      width: 52,
      height: 200,
      toJSON() {
        return {};
      },
    });
  });

  it("exposes a fixed nav stack on the left by default", () => {
    const { container } = render(<Harness />);
    const stack = container.querySelector('[data-testid="map-nav-dock-stack"]');
    expect(stack?.getAttribute("data-chrome-nav-stack")).toBe("phone");
    expect(stack?.getAttribute("data-side")).toBe("left");
    expect(
      screen.getByRole("group", { name: /Map controls\. Drag to reposition/i }),
    ).toBeInTheDocument();
  });

  it("cycles placement with keyboard", () => {
    render(<Harness />);
    const stack = screen.getByRole("group", {
      name: /Map controls\. Drag to reposition/i,
    });
    fireEvent.keyDown(stack, { key: "Enter" });
    expect(stack.getAttribute("data-side")).toBe("left");
    fireEvent.keyDown(stack, { key: "Enter" });
    expect(stack.getAttribute("data-side")).toBe("right");
  });
});
