import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearActiveRevealTransitionForTests,
  revealRouteTransition,
} from "./revealRouteTransition";

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

describe("revealRouteTransition", () => {
  const originalStartViewTransition = document.startViewTransition;

  beforeEach(() => {
    clearActiveRevealTransitionForTests();
    document.documentElement.removeAttribute("data-nav-direction");
  });

  afterEach(() => {
    document.startViewTransition = originalStartViewTransition;
    document.getElementById("root")?.remove();
  });

  it("commits navigation inside the startViewTransition callback", async () => {
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

    capturedCallback?.();
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

  it("navigates immediately without VT when startViewTransition is missing", async () => {
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

      await vi.advanceTimersByTimeAsync(500);
      await pending;
    } finally {
      vi.useRealTimers();
    }
  });

  it("navigates immediately without VT when animate is false", async () => {
    const startViewTransition = vi.fn();
    document.startViewTransition = startViewTransition;

    const commit = vi.fn();

    await revealRouteTransition("neutral", false, commit);

    expect(commit).toHaveBeenCalledTimes(1);
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.navDirection).toBe("neutral");
  });
});
