import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAP_CHROME_DOCKS_STORAGE_KEY,
  MAP_NAV_DOCK_STORAGE_KEY,
  type MapChromeDockPlacement,
} from "@/hooks/map/mapChromeDockPlacement";
import { MapDraggableFixedStack } from "./MapDraggableFixedStack";

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

  it("rests with edge padding on left and right (React owns inset)", () => {
    const { container, unmount } = render(<Harness />);
    const stack = container.querySelector('[data-testid="map-nav-dock-stack"]') as HTMLElement;
    expect(stack.style.left).toBe("12px");
    expect(stack.style.right).toBe("auto");
    unmount();

    const right = render(<Harness initial={{ side: "right", topRatio: 0.72 }} />);
    const rightStack = right.container.querySelector(
      '[data-testid="map-nav-dock-stack"]',
    ) as HTMLElement;
    expect(rightStack.style.right).toBe("12px");
    expect(rightStack.style.left).toBe("auto");
  });

  it("does not complete settle on animation cancel (Strict Mode safe)", () => {
    type Listener = EventListener;
    const animators: Array<{
      cancel: () => void;
      finishListeners: Listener[];
    }> = [];
    let rectN = 0;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => {
      rectN += 1;
      const top = 100 + rectN * 40;
      return {
        x: 12,
        y: top,
        top,
        left: 12,
        bottom: top + 200,
        right: 64,
        width: 52,
        height: 200,
        toJSON() {
          return {};
        },
      };
    });

    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      writable: true,
      value: function animateMock(this: HTMLElement) {
        const finishListeners: Listener[] = [];
        const cancelListeners: Listener[] = [];
        const anim = {
          playState: "running" as AnimationPlayState,
          finished: Promise.resolve(),
          cancel() {
            anim.playState = "idle";
            for (const listener of cancelListeners) {
              listener(new Event("cancel"));
            }
          },
          addEventListener(type: string, listener: Listener) {
            if (type === "finish") finishListeners.push(listener);
            if (type === "cancel") cancelListeners.push(listener);
          },
          removeEventListener() {},
        };
        animators.push({
          cancel: () => anim.cancel(),
          finishListeners,
        });
        return anim as unknown as Animation;
      },
    });

    render(<Harness initial={{ side: "left", topRatio: 0.4 }} />);
    const stack = screen.getByRole("group", {
      name: /Map controls\. Drag to reposition/i,
    });

    fireEvent.keyDown(stack, { key: "Enter" });
    expect(animators.length).toBeGreaterThanOrEqual(1);
    const first = animators[animators.length - 1]!;
    expect(stack.getAttribute("data-settling")).toBe("true");
    expect(stack.style.left).toBe("12px");

    first.cancel();
    // Cancel must not run finish→onDone (that cleared settleFromRef / snapped).
    expect(first.finishListeners.length).toBeGreaterThanOrEqual(1);
    expect(stack.getAttribute("data-settling")).toBe("true");
    expect(stack.style.left).toBe("12px");
  });
});
