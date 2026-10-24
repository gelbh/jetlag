/** Map-first eligibility for hider set/move zone (Z1).
 * ponytail yagni waiver: named helper kept for matrix tests (single product call site).
 * Create and move both require methodChosen (station vs map picker first).
 */
export function isHidingZoneMapFirstEligible({
  wizardOpen,
  sheetBlocksWizard,
  methodChosen,
}: {
  wizardOpen: boolean;
  sheetBlocksWizard: boolean;
  /** Kept for call-site matrix; eligibility no longer short-circuits on move. */
  moveMode: boolean;
  methodChosen: boolean;
}): boolean {
  return wizardOpen && !sheetBlocksWizard && methodChosen;
}
