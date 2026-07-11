import { describe, expect, it } from "vitest";
import {
  shouldCommitWizardSwipe,
  WIZARD_SWIPE_COMMIT_FRACTION,
  WIZARD_SWIPE_COMMIT_VELOCITY_PX_MS,
} from "./useWizardSwipe";

describe("useWizardSwipe", () => {
  const width = 320;
  const threshold = width * WIZARD_SWIPE_COMMIT_FRACTION;

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
