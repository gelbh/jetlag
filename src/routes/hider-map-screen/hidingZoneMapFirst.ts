/** Map-first eligibility for hider set/move zone (Z1). */
export function isHidingZoneMapFirstEligible(input: {
  wizardOpen: boolean;
  sheetBlocksWizard: boolean;
  moveMode: boolean;
  methodChosen: boolean;
}): boolean {
  return (
    input.wizardOpen &&
    !input.sheetBlocksWizard &&
    (input.moveMode || input.methodChosen)
  );
}
