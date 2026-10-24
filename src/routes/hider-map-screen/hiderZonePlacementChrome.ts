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
