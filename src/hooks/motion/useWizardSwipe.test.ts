import { describe, expect, it } from "vitest";
import {
  isInteractiveWizardSwipeTarget,
  shouldCommitWizardSwipe,
  WIZARD_SWIPE_COMMIT_FRACTION,
  WIZARD_SWIPE_COMMIT_VELOCITY_PX_MS,
} from "./useWizardSwipe";

describe("useWizardSwipe", () => {
  const width = 320;
  const threshold = width * WIZARD_SWIPE_COMMIT_FRACTION;

  it("treats buttons and inputs as non-swipe targets", () => {
    const button = document.createElement("button");
    const input = document.createElement("input");
    const wrapper = document.createElement("div");
    wrapper.append(button);

    expect(isInteractiveWizardSwipeTarget(button)).toBe(true);
    expect(isInteractiveWizardSwipeTarget(input)).toBe(true);
    expect(isInteractiveWizardSwipeTarget(wrapper)).toBe(false);
  });

  it("treats text nodes inside buttons as non-swipe targets", () => {
    const button = document.createElement("button");
    button.textContent = "Closer";
    const text = button.firstChild;

    expect(text).not.toBeNull();
    expect(isInteractiveWizardSwipeTarget(text)).toBe(true);
  });

  it("treats data-wizard-no-swipe regions as non-swipe targets", () => {
    const region = document.createElement("div");
    region.setAttribute("data-wizard-no-swipe", "");
    const child = document.createElement("span");
    child.textContent = "Further";
    region.append(child);

    expect(isInteractiveWizardSwipeTarget(child)).toBe(true);
  });

  it("commits forward when dragged past the threshold", () => {
    expect(
      shouldCommitWizardSwipe(-threshold, width, 0, "next"),
    ).toBe(true);
    expect(
      shouldCommitWizardSwipe(-threshold + 1, width, 0, "next"),
    ).toBe(false);
  });

  it("commits back when dragged past the threshold", () => {
    expect(
      shouldCommitWizardSwipe(threshold, width, 0, "back"),
    ).toBe(true);
    expect(
      shouldCommitWizardSwipe(threshold - 1, width, 0, "back"),
    ).toBe(false);
  });

  it("commits forward on a fast left flick", () => {
    expect(
      shouldCommitWizardSwipe(
        0,
        width,
        -(WIZARD_SWIPE_COMMIT_VELOCITY_PX_MS + 0.05),
        "next",
      ),
    ).toBe(true);
  });

  it("commits back on a fast right flick", () => {
    expect(
      shouldCommitWizardSwipe(
        0,
        width,
        WIZARD_SWIPE_COMMIT_VELOCITY_PX_MS + 0.05,
        "back",
      ),
    ).toBe(true);
  });
});
