/** Map-first eligibility for hider set/move zone (Z1).
 * ponytail yagni waiver: named helper kept for matrix tests (single product call site).
 */
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
