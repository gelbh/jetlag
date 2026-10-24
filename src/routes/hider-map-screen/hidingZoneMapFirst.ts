export function isHidingZoneMapFirstEligible({
  wizardOpen,
  sheetBlocksWizard,
  methodChosen,
}: {
  wizardOpen: boolean;
  sheetBlocksWizard: boolean;
  moveMode: boolean;
  methodChosen: boolean;
}): boolean {
  return wizardOpen && !sheetBlocksWizard && methodChosen;
}
