import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearActiveRevealTransition,
  revealRouteTransition,
} from "../../navigation/revealRouteTransition";
import {
  RESUME_FALLBACK_CLASSES,
  clearResumeVisualArtifacts,
  resumeWatchdogBudgets,
  rootHasInteractiveShell,
  rootHasResumeReady,
} from "./resumeShell";

describe("resumeShell", () => {
  afterEach(() => {
    document.getElementById("root")?.remove();
    clearActiveRevealTransition();
    vi.restoreAllMocks();
  });

  it("rootHasInteractiveShell is false for empty root", () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
    expect(rootHasInteractiveShell(root)).toBe(false);
  });

  it("rootHasInteractiveShell is true when a button is present", () => {
    const root = document.createElement("div");
    root.id = "root";
    root.appendChild(document.createElement("button"));
    document.body.appendChild(root);
    expect(rootHasInteractiveShell(root)).toBe(true);
  });

  it("rootHasInteractiveShell treats aria-busy as interactive", () => {
    const root = document.createElement("div");
    root.id = "root";
    const status = document.createElement("div");
    status.setAttribute("aria-busy", "true");
    root.appendChild(status);
    document.body.appendChild(root);
    expect(rootHasInteractiveShell(root)).toBe(true);
  });

  it("rootHasResumeReady is false for empty root", () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
    expect(rootHasResumeReady(root)).toBe(false);
  });

  it("rootHasResumeReady is true when data-resume-ready is set", () => {
    const root = document.createElement("div");
    root.id = "root";
    const desk = document.createElement("div");
    desk.setAttribute("data-resume-ready", "true");
    root.appendChild(desk);
    document.body.appendChild(root);
    expect(rootHasResumeReady(root)).toBe(true);
  });

  it("rootHasResumeReady ignores other data-resume-ready values", () => {
    const root = document.createElement("div");
    root.id = "root";
    const desk = document.createElement("div");
    desk.setAttribute("data-resume-ready", "false");
    root.appendChild(desk);
    document.body.appendChild(root);
    expect(rootHasResumeReady(root)).toBe(false);
  });

  it("clearResumeVisualArtifacts strips fallback classes and skips VT", () => {
    const root = document.createElement("div");
    root.id = "root";
    root.classList.add(...RESUME_FALLBACK_CLASSES);
    document.body.appendChild(root);

    const skipTransition = vi.fn();
    document.startViewTransition = vi.fn(() => {
      const finished = Promise.resolve();
      return {
        finished,
        ready: finished,
        updateCallbackDone: finished,
        skipTransition,
        types: new Set(),
      } as unknown as ViewTransition;
    });

    void revealRouteTransition("forward", true, () => undefined);
    expect(skipTransition).not.toHaveBeenCalled();

    clearResumeVisualArtifacts();

    expect(skipTransition).toHaveBeenCalledTimes(1);
    for (const className of RESUME_FALLBACK_CLASSES) {
      expect(root.classList.contains(className)).toBe(false);
    }
  });

  describe("resumeWatchdogBudgets", () => {
    beforeEach(() => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0",
        platform: "Linux",
        maxTouchPoints: 0,
      });
      vi.stubGlobal(
        "matchMedia",
        vi.fn().mockReturnValue({
          matches: false,
          media: "",
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }),
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("returns desktop browser budgets for player routes", () => {
      expect(resumeWatchdogBudgets("/")).toEqual({ graceMs: 800, budgetMs: 3000 });
      expect(resumeWatchdogBudgets("/map")).toEqual({
        graceMs: 800,
        budgetMs: 3000,
      });
    });

    it("applies admin multipliers with budget capped at 6000ms", () => {
      expect(resumeWatchdogBudgets("/admin")).toEqual({
        graceMs: 1200,
        budgetMs: 6000,
      });
      expect(resumeWatchdogBudgets("/admin/incidents")).toEqual({
        graceMs: 1200,
        budgetMs: 6000,
      });
    });

    it("does not treat /administration as an admin route", () => {
      expect(resumeWatchdogBudgets("/administration")).toEqual({
        graceMs: 800,
        budgetMs: 3000,
      });
    });
  });
});
