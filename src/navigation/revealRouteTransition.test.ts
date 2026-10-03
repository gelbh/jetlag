import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearActiveRevealTransitionForTests,
  revealRouteTransition,
} from "./revealRouteTransition";

const flushSyncMock = vi.hoisted(() =>
  vi.fn((callback: () => void) => {
    callback();
  }),
);

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return {
    ...actual,
    flushSync: flushSyncMock,
  };
});

const FALLBACK_CLASSES = [
  "jl-route-fallback-enter-forward",
  "jl-route-fallback-enter-back",
  "jl-route-fallback-enter-neutral",
] as const;

function hasFallbackEnterClass(el: Element): boolean {
  return FALLBACK_CLASSES.some((className) => el.classList.contains(className));
}

describe("revealRouteTransition", () => {
  const originalStartViewTransition = document.startViewTransition;

  beforeEach(() => {
    clearActiveRevealTransitionForTests();
    flushSyncMock.mockClear();
    document.documentElement.removeAttribute("data-nav-direction");
  });

  afterEach(() => {
    document.startViewTransition = originalStartViewTransition;
    document.getElementById("root")?.remove();
  });

  it("commits without manual view transition when decorative animate is on (Verify #1)", async () => {
    const startViewTransition = vi.fn();
    document.startViewTransition = startViewTransition;

    const commit = vi.fn();
    await revealRouteTransition("forward", true, commit);

    expect(commit).toHaveBeenCalledTimes(1);
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(flushSyncMock).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.navDirection).toBe("forward");
  });

  it("sets data-nav-direction for back and neutral when decorative animate is on", async () => {
    document.startViewTransition = vi.fn();

    await revealRouteTransition("back", true, vi.fn());
    expect(document.documentElement.dataset.navDirection).toBe("back");

    await revealRouteTransition("neutral", true, vi.fn());
    expect(document.documentElement.dataset.navDirection).toBe("neutral");
  });

  it("commits with no VT and no fallback class when decorative animate is false (Verify #2)", async () => {
    const startViewTransition = vi.fn();
    document.startViewTransition = startViewTransition;

    const commit = vi.fn();
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    await revealRouteTransition("neutral", false, commit);

    expect(commit).toHaveBeenCalledTimes(1);
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(flushSyncMock).not.toHaveBeenCalled();
    expect(hasFallbackEnterClass(root)).toBe(false);
    expect(document.documentElement.dataset.navDirection).toBe("neutral");
  });

  it("commits without startViewTransition when document is hidden (Verify #3)", async () => {
    const visibilityDescriptor = Object.getOwnPropertyDescriptor(
      Document.prototype,
      "visibilityState",
    );
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });

    try {
      const startViewTransition = vi.fn();
      document.startViewTransition = startViewTransition;
      const commit = vi.fn();
      const root = document.createElement("div");
      root.id = "root";
      document.body.appendChild(root);

      await revealRouteTransition("forward", true, commit);

      expect(commit).toHaveBeenCalledTimes(1);
      expect(startViewTransition).not.toHaveBeenCalled();
      expect(flushSyncMock).not.toHaveBeenCalled();
      expect(hasFallbackEnterClass(root)).toBe(false);
      expect(document.documentElement.dataset.navDirection).toBe("forward");
    } finally {
      if (visibilityDescriptor) {
        Object.defineProperty(document, "visibilityState", visibilityDescriptor);
      } else {
        Reflect.deleteProperty(document, "visibilityState");
      }
    }
  });

  it("commits without helper-owned fallback enter class when VT API is missing", async () => {
    // @ts-expect-error simulating an environment without View Transitions support
    document.startViewTransition = undefined;

    const commit = vi.fn();
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    await revealRouteTransition("back", true, commit);

    expect(commit).toHaveBeenCalledTimes(1);
    expect(flushSyncMock).not.toHaveBeenCalled();
    expect(hasFallbackEnterClass(root)).toBe(false);
    expect(document.documentElement.dataset.navDirection).toBe("back");
  });

  it("route CSS durations use --motion-route tokens (Verify #5)", () => {
    const stylesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../styles");
    const baseCss = readFileSync(resolve(stylesDir, "base.css"), "utf8");
    const motionCss = readFileSync(resolve(stylesDir, "motion.css"), "utf8");
    const routeTransitionCss = readFileSync(resolve(stylesDir, "route-transition.css"), "utf8");

    expect(baseCss).toMatch(/--motion-route-reveal:\s*260ms/);
    expect(baseCss).toMatch(/--motion-route-overlay-exit:\s*200ms/);
    expect(motionCss).toMatch(
      /\.jl-route-fallback-enter-forward\s*\{[^}]*var\(--motion-route-reveal\)/s,
    );
    expect(motionCss).toMatch(
      /::view-transition-old\(root\)[^;{]*\{[^}]*var\(--motion-route-reveal\)/s,
    );
    expect(routeTransitionCss).toMatch(/var\(--motion-route-overlay-exit/);
    expect(motionCss).not.toMatch(/\.jl-route-fallback-enter-\w+\s*\{[^}]*animation:[^;]*\d+ms/s);
  });
});
