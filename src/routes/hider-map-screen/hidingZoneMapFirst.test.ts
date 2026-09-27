import { describe, expect, it } from "vitest";
import { isHidingZoneMapFirstEligible } from "./hidingZoneMapFirst";

describe("isHidingZoneMapFirstEligible", () => {
  it("is false on method-only sheet (wizard open, method not chosen)", () => {
    expect(
      isHidingZoneMapFirstEligible({
        wizardOpen: true,
        sheetBlocksWizard: false,
        moveMode: false,
        methodChosen: false,
      }),
    ).toBe(false);
  });

  it("is true after Map/Station method is chosen", () => {
    expect(
      isHidingZoneMapFirstEligible({
        wizardOpen: true,
        sheetBlocksWizard: false,
        moveMode: false,
        methodChosen: true,
      }),
    ).toBe(true);
  });

  it("is true in move mode without method chips", () => {
    expect(
      isHidingZoneMapFirstEligible({
        wizardOpen: true,
        sheetBlocksWizard: false,
        moveMode: true,
        methodChosen: false,
      }),
    ).toBe(true);
  });

  it("is false when chat/settings sheet blocks the wizard", () => {
    expect(
      isHidingZoneMapFirstEligible({
        wizardOpen: true,
        sheetBlocksWizard: true,
        moveMode: false,
        methodChosen: true,
      }),
    ).toBe(false);
  });
});
