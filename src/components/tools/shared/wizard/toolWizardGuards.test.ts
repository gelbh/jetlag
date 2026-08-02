import { describe, expect, it, vi } from "vitest";
import {
  toolWizardPhasePrimaryNav,
  toolWizardSwipeNext,
} from "./toolWizardGuards";

describe("toolWizardPhasePrimaryNav", () => {
  it("wires ask-phase primary to commit, not goNext", () => {
    const goNext = vi.fn();
    const onCommit = vi.fn();
    const nav = toolWizardPhasePrimaryNav({
      phaseId: "ask",
      goNext,
      onCommit,
      canGoNext: true,
      canCommit: true,
    });

    expect(nav.canGoNext).toBe(true);
    nav.onNext();
    expect(onCommit).toHaveBeenCalledOnce();
    expect(goNext).not.toHaveBeenCalled();
  });

  it("disables ask-phase primary when commit is blocked", () => {
    const nav = toolWizardPhasePrimaryNav({
      phaseId: "ask",
      goNext: vi.fn(),
      onCommit: vi.fn(),
      canGoNext: true,
      canCommit: false,
    });
    expect(nav.canGoNext).toBe(false);
  });

  it("keeps place/configure primary as goNext", () => {
    const goNext = vi.fn();
    const onCommit = vi.fn();
    const nav = toolWizardPhasePrimaryNav({
      phaseId: "place",
      goNext,
      onCommit,
      canGoNext: true,
      canCommit: false,
    });

    expect(nav.canGoNext).toBe(true);
    nav.onNext();
    expect(goNext).toHaveBeenCalledOnce();
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("toolWizardSwipeNext", () => {
  it("blocks swipe on the last phase even when canGoNext is true", () => {
    expect(toolWizardSwipeNext(true, 2, 3)).toBe(false);
    expect(toolWizardSwipeNext(true, 1, 3)).toBe(true);
  });
});
