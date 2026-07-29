import type { MapChromeControlInset } from "../../map/helpers/mapChromeControlInset";

export function resolveLandscapeMapControlInset(
  baseInset: MapChromeControlInset,
  isDesktop: boolean,
  landscape: {
    active: boolean;
    collapsed: boolean;
    mapControlInset: MapChromeControlInset;
  },
): MapChromeControlInset {
  if (
    isDesktop ||
    !landscape.active ||
    !landscape.collapsed ||
    baseInset !== "dock"
  ) {
    return baseInset;
  }

  return landscape.mapControlInset;
}
