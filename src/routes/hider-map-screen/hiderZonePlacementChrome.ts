/** Placement focus: hide competing dock / map nav while the zone wizard is open.
 * ponytail yagni waiver: named helper kept for matrix tests (two product call sites).
 */
export function resolveHiderZonePlacementChromeVisibility(wizardOpen: boolean): {
  showToolDock: boolean;
  showMapControls: boolean;
} {
  const show = !wizardOpen;
  return {
    showToolDock: show,
    showMapControls: show,
  };
}
