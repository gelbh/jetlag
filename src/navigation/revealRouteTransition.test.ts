import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearActiveRevealTransition,
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

type FakeViewTransition = ViewTransition & {
  resolveFinished: () => void;
  rejectFinished: (reason?: unknown) => void;
};

function createFakeViewTransition(): FakeViewTransition {
  let resolveFinished!: () => void;
  let rejectFinished!: (reason?: unknown) => void;
  const finished = new Promise<void>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });

  return {
    finished,
    ready: Promise.resolve(),
    updateCallbackDone: Promise.resolve(),
    skipTransition: vi.fn(),
    types: new Set(),
    resolveFinished,
    rejectFinished,
  } as unknown as FakeViewTransition;
}

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

  it("commits navigation via flushSync inside startViewTransition (Verify #1)", async () => {
    const order: string[] = [];
    let capturedCallback: (() => void) | undefined;
    const startViewTransition = vi.fn((callback: () => void) => {
      capturedCallback = callback;
      return createFakeViewTransition();
    });
    document.startViewTransition = startViewTransition;

    const commit = vi.fn(() => order.push("commit"));

    const pending = revealRouteTransition("forward", true, commit);

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    expect(flushSyncMock).not.toHaveBeenCalled();

    capturedCallback?.();
    expect(flushSyncMock).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["commit"]);

    const transition = startViewTransition.mock.results[0]?.value as FakeViewTransition;
    transition.resolveFinished();
    await pending;

    expect(document.documentElement.dataset.navDirection).toBe("forward");
  });

  it("skips any in-flight transition before starting a new one", () => {
    const transitions: FakeViewTransition[] = [];
    document.startViewTransition = vi.fn((callback: () => void) => {
      callback();
      const transition = createFakeViewTransition();
      transitions.push(transition);
      return transition;
    });

    void revealRouteTransition("forward", true, vi.fn());
    void revealRouteTransition("back", true, vi.fn());

    expect(transitions[0]?.skipTransition).toHaveBeenCalledTimes(1);
    expect(transitions[1]?.skipTransition).not.toHaveBeenCalled();
  });

  it("clearActiveRevealTransition skips and drops the active handle", () => {
    const transition = createFakeViewTransition();
    document.startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return transition;
    });

    void revealRouteTransition("forward", true, vi.fn());
    clearActiveRevealTransition();

    expect(transition.skipTransition).toHaveBeenCalledTimes(1);

    clearActiveRevealTransition();
    expect(transition.skipTransition).toHaveBeenCalledTimes(1);
  });

  it("applies then clears fallback enter class when VT is missing (Verify #4)", async () => {
    // @ts-expect-error simulating an environment without View Transitions support
    document.startViewTransition = undefined;
    vi.useFakeTimers();

    try {
      const commit = vi.fn();
      const root = document.createElement("div");
      root.id = "root";
      document.body.appendChild(root);

      const pending = revealRouteTransition("back", true, commit);

      expect(commit).toHaveBeenCalledTimes(1);
      expect(document.documentElement.dataset.navDirection).toBe("back");
      expect(root.classList.contains("jl-route-fallback-enter-back")).toBe(true);

      await vi.advanceTimersByTimeAsync(500);
      await pending;

      expect(root.classList.contains("jl-route-fallback-enter-back")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores bubbled child animationend events during fallback reveal", async () => {
    // @ts-expect-error simulating an environment without View Transitions support
    document.startViewTransition = undefined;

    const commit = vi.fn();
    const root = document.createElement("div");
    root.id = "root";
    const child = document.createElement("div");
    root.appendChild(child);
    document.body.appendChild(root);

    const pending = revealRouteTransition("forward", true, commit);

    expect(commit).toHaveBeenCalledTimes(1);
    expect(root.classList.contains("jl-route-fallback-enter-forward")).toBe(true);

    child.dispatchEvent(new Event("animationend", { bubbles: true }));
    expect(root.classList.contains("jl-route-fallback-enter-forward")).toBe(true);

    root.dispatchEvent(new Event("animationend", { bubbles: true }));
    await pending;

    expect(root.classList.contains("jl-route-fallback-enter-forward")).toBe(false);
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
        Object.defineProperty(
          document,
          "visibilityState",
          visibilityDescriptor,
        );
      } else {
        Reflect.deleteProperty(document, "visibilityState");
      }
    }
  });

  it("swallows finished rejection so it never surfaces uncaught", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    try {
      const transition = createFakeViewTransition();
      document.startViewTransition = vi.fn((callback: () => void) => {
        callback();
        return transition;
      });

      const pending = revealRouteTransition("forward", true, vi.fn());
      transition.rejectFinished(
        new DOMException(
          "Skipping view transition because document visibility state has become hidden.",
          "InvalidStateError",
        ),
      );
      await expect(pending).resolves.toBeUndefined();
      await Promise.resolve();
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("route CSS durations use --motion-route tokens (Verify #5)", () => {
    const stylesDir = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../styles",
    );
    const baseCss = readFileSync(resolve(stylesDir, "base.css"), "utf8");
    const motionCss = readFileSync(resolve(stylesDir, "motion.css"), "utf8");
    const routeTransitionCss = readFileSync(
      resolve(stylesDir, "route-transition.css"),
      "utf8",
    );

    expect(baseCss).toMatch(/--motion-route-reveal:\s*260ms/);
    expect(baseCss).toMatch(/--motion-route-overlay-exit:\s*200ms/);
    expect(motionCss).toMatch(
      /\.jl-route-fallback-enter-forward\s*\{[^}]*var\(--motion-route-reveal\)/s,
    );
    expect(motionCss).toMatch(
      /::view-transition-old\(root\)[^;{]*\{[^}]*var\(--motion-route-reveal\)/s,
    );
    expect(routeTransitionCss).toMatch(/var\(--motion-route-overlay-exit/);
    expect(motionCss).not.toMatch(
      /\.jl-route-fallback-enter-\w+\s*\{[^}]*animation:[^;]*\d+ms/s,
    );
  });
});
